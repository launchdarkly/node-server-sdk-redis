const base = require('./redis_base');
const dataKind = require('launchdarkly-node-server-sdk/versioned_data_kind');
const CachingStoreWrapper = require('launchdarkly-node-server-sdk/caching_store_wrapper');

const noop = function() {};

function RedisFeatureStore(redisOpts, cacheTTL, prefix, logger, client) {
  let options;
  if (cacheTTL || prefix || logger || client) {
    // convert from older syntax
    options = { redisOpts, cacheTTL, prefix, client };
  } else {
    // first parameter could be either options (newer syntax) or redisOpts
    options = redisOpts || {};
    if (options.redisOpts === undefined && options.cacheTTL === undefined
        && options.prefix === undefined && options.client === undefined) {
      options = { redisOpts };
    }
  }
  return config =>
    new CachingStoreWrapper(
      redisFeatureStoreInternal(options, logger || config.logger),
      options.cacheTTL,
      'Redis'
    );
  // Note, config.logger is guaranteed to be defined - the SDK will have provided a default one if necessary
}

function redisFeatureStoreInternal(options, logger) {
  const state = base.initState(options, logger);
  const client = state.client;
  const itemsPrefix = state.prefix + ':';
  const initedKey = itemsPrefix + '$inited';

  const store = {};

  function itemsKey(kind) {
    return itemsPrefix + kind.namespace;
  }

  // A helper that performs a get with the redis client
  function doGet(kind, key, maybeCallback) {
    const cb = maybeCallback || noop;

    if (!state.connected && !state.initialConnect) {
      logger.warn('Attempted to fetch key ' + key + ' while Redis connection is down');
      cb(null);
      return;
    }

    client.hget(itemsKey(kind), key, (err, obj) => {
      if (err) {
        logger.error('Error fetching key ' + key + " from Redis in '" + kind.namespace + "'", err); // eslint-disable-line quotes
        cb(null);
      } else {
        const item = JSON.parse(obj);
        cb(item);
      }
    });
  }

  store.getInternal = (kind, key, maybeCallback) => {
    const cb = maybeCallback || noop;
    doGet(kind, key, item => {
      if (item && !item.deleted) {
        cb(item);
      } else {
        cb(null);
      }
    });
  };

  store.getAllInternal = (kind, maybeCallback) => {
    const cb = maybeCallback || noop;
    if (!state.connected && !state.initialConnect) {
      logger.warn('Attempted to fetch all keys while Redis connection is down');
      cb(null);
      return;
    }

    client.hgetall(itemsKey(kind), (err, obj) => {
      if (err) {
        logger.error("Error fetching '" + kind.namespace + "' from Redis", err); // eslint-disable-line quotes
        cb(null);
      } else {
        const results = {},
          items = obj;

        for (const key in items) {
          if (Object.hasOwnProperty.call(items, key)) {
            results[key] = JSON.parse(items[key]);
          }
        }
        cb(results);
      }
    });
  };

  store.initInternal = (allData, cb) => {
    const multi = client.multi();

    for (const kindNamespace in allData) {
      if (Object.hasOwnProperty.call(allData, kindNamespace)) {
        const kind = dataKind[kindNamespace];
        const baseKey = itemsKey(kind);
        const items = allData[kindNamespace];
        const stringified = {};
        multi.del(baseKey);
        for (const key in items) {
          if (Object.hasOwnProperty.call(items, key)) {
            stringified[key] = JSON.stringify(items[key]);
          }
        }
        // Redis does not allow hmset() with an empty object
        if (Object.keys(stringified).length > 0) {
          multi.hmset(baseKey, stringified);
        }
      }
    }

    multi.set(initedKey, '');

    multi.exec(err => {
      if (err) {
        logger.error('Error initializing Redis store', err);
      }
      cb();
    });
  };

  store.upsertInternal = (kind, item, cb) => {
    updateItemWithVersioning(kind, item, (err, attemptedWrite) => {
      if (err) {
        logger.error('Error upserting key ' + item.key + " in '" + kind.namespace + "'", err); // eslint-disable-line quotes
      }
      cb(err, attemptedWrite);
    });
  };

  function updateItemWithVersioning(kind, newItem, cb) {
    client.watch(itemsKey(kind));
    const multi = client.multi();
    // testUpdateHook is instrumentation, used only by the unit tests
    const prepare =
      store.testUpdateHook ||
      function(prepareCb) {
        prepareCb();
      };
    prepare(() => {
      doGet(kind, newItem.key, oldItem => {
        if (oldItem && oldItem.version >= newItem.version) {
          multi.discard();
          cb(null, oldItem);
        } else {
          multi.hset(itemsKey(kind), newItem.key, JSON.stringify(newItem));
          multi.exec((err, replies) => {
            if (!err && replies === null) {
              // This means the EXEC failed because someone modified the watched key
              logger.debug('Concurrent modification detected, retrying');
              updateItemWithVersioning(kind, newItem, cb);
            } else {
              cb(err, newItem);
            }
          });
        }
      });
    });
  }

  store.initializedInternal = maybeCallback => {
    const cb = maybeCallback || noop;
    client.exists(initedKey, (err, obj) => {
      cb(Boolean(!err && obj));
    });
  };

  store.close = () => {
    if (state.stopClientOnClose) {
      client.quit();
    }
  };

  return store;
}

module.exports = RedisFeatureStore;
