const { RedisBigSegmentStore, RedisFeatureStore } = require('../index');
const { keyLastUpToDate, keyUserInclude, keyUserExclude } = require('../redis_big_segment_store');
const {
  runPersistentFeatureStoreTests,
  runBigSegmentStoreTests,
} = require('launchdarkly-node-server-sdk/sharedtest/store_tests');
const redis = require('redis');
const { promisify } = require('util');

const defaultPrefix = 'launchdarkly';

// Runs the standard test suites provided by the SDK's store_tests module.

// This is a single file because if the two test suites were run from separate files, they could
// be interleaved by Jest. Since our implementation of clearAllData is not very smart and will
// remove *all* keys with the given prefix, we could step on another test's data if the shared
// test suites happen to use the same prefix.

function actualPrefix(prefix) {
  return prefix || defaultPrefix;
}

function clearAllData(client) {
  return async prefix => {
    const keys = await promisify(client.keys.bind(client))(actualPrefix(prefix) + ':*');
    for (const key of keys) {
      await promisify(client.del.bind(client))(key);
    }
  };
}

describe('RedisFeatureStore', () => {
  const redisOpts = { url: 'redis://localhost:6379' };

  const client = redis.createClient(redisOpts);

  function createStore(prefix, cacheTTL, logger) {
    return RedisFeatureStore({ redisOpts, cacheTTL, prefix })({ logger });
  }

  function createStoreWithConcurrentUpdateHook(prefix, logger, hook) {
    const store = createStore(prefix, 0, logger);
    store.underlyingStore.testUpdateHook = hook;
    return store;
  }

  runPersistentFeatureStoreTests(
    createStore,
    clearAllData(client),
    createStoreWithConcurrentUpdateHook,
  );

  afterAll(() => {
    client.quit();
  });
});

describe('RedisBigSegmentStore', () => {
  const redisOpts = { url: 'redis://localhost:6379' };

  const client = redis.createClient(redisOpts);

  function createStore(prefix, logger) {
    return RedisBigSegmentStore({ redisOpts, prefix })({ logger });
  }

  async function setMetadata(prefix, metadata) {
    await promisify(client.set.bind(client))(actualPrefix(prefix) + ':' + keyLastUpToDate,
      metadata.lastUpToDate ? metadata.lastUpToDate.toString() : '');
  }

  async function setSegments(prefix, userHashKey, includes, excludes) {
    for (const ref of includes) {
      await promisify(client.sadd.bind(client))(actualPrefix(prefix) + ':' + keyUserInclude + userHashKey, ref);
    }
    for (const ref of excludes) {
      await promisify(client.sadd.bind(client))(actualPrefix(prefix) + ':' + keyUserExclude + userHashKey, ref);
    }
  }

  runBigSegmentStoreTests(
    createStore,
    clearAllData(client),
    setMetadata,
    setSegments,
  );

  afterAll(() => {
    client.quit();
  });
});
