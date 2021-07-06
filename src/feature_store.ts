import { BaseRedis } from "./base";
import { LDRedisOptions } from "./options";

import * as ld from "launchdarkly-node-server-sdk";
import * as CachingStoreWrapper from "launchdarkly-node-server-sdk/caching_store_wrapper";
import * as dataKind from "launchdarkly-node-server-sdk/versioned_data_kind";

import { ClientOpts, RedisClient } from "redis";

// Here we"re declaring some interfaces that the SDK doesn"t currently export for the
// internal persistent data store API - currently it declares them only as "object"
interface DataKind {
  namespace: string;
}

interface KeyedItems {
  [name: string]: object;
}

interface FullDataSet {
  [namespace: string]: KeyedItems;
}

/**
 * Configures a feature store backed by a Redis instance.
 *
 * For more details about how and why you can use a persistent feature store, see
 * the [SDK features guide](https://docs.launchdarkly.com/sdk/features/database-integrations).
 *
 * For backward compatibility, this function supports both an older syntax that uses multiple
 * parameters and a newer one that uses an [[LDRedisOptions]] object. The newer style is preferred,
 * for clarity:
 *
 * ```
 * const store = RedisFeatureStore(
 *   {
 *     redisOpts: { host: "redishost", port: 6379 },
 *     prefix: "app1",
 *     cacheTTL: 30
 *   });
 * ```
 *
 * The equivalent in the older syntax (which will be dropped in a future version) would be:
 *
 * ```
 * const store = RedisFeatureStore(
 *   { host: "redishost", port: 6379 },
 *   30,
 *   "app1"
 * );
 * ```
 *
 * @param redisOpts
 *   Optional configuration parameters to be passed to the `redis` package.
 * @param cacheTTL
 *   The amount of time, in seconds, that recently read or updated items should remain in an
 *   in-memory cache. If it is zero, there will be no in-memory caching.
 * @param prefix
 *   A string that should be prepended to all Redis keys used by the feature store.
 * @param logger
 *   A custom logger for warnings and errors. If not specified, it will use whatever the
 *   SDK"s logging configuration is.
 * @param client
 *   Pass this parameter if you already have a Redis client instance that you wish to reuse. In this case,
 *   `redisOpts` will be ignored.
 *
 * @returns
 *   A factory function that the SDK will use to create the data store. Put this value into the
 *   `featureStore` property of [[LDOptions]].
 */

export function RedisFeatureStore(
  redisOpts?: ClientOpts | LDRedisOptions,
  cacheTTL?: number,
  prefix?: string,
  logger?: ld.LDLogger,
  client?: RedisClient,
): (config: ld.LDOptions) => ld.LDFeatureStore {
  let options: LDRedisOptions;
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
  return (config) =>
    new CachingStoreWrapper(
      new RedisFeatureStoreImpl(options, logger || config.logger),
      options.cacheTTL,
      "Redis",
    );
  // Note, config.logger is guaranteed to be defined - the SDK will have provided a default one if necessary
}

export class RedisFeatureStoreImpl {
  public testUpdateHook: (callback: () => void) => void; // exposed for tests

  private state: BaseRedis;
  private client: RedisClient;
  private logger: ld.LDLogger;
  private prefix: string;
  private initedKey: string;

  public constructor(options: LDRedisOptions, logger: ld.LDLogger) {
    this.state = new BaseRedis(options, logger);
    this.client = this.state.client;
    this.logger = logger;
    this.prefix = this.state.prefix;
    this.initedKey = this.prefix + "$inited";
  }

  public getInternal(kind: DataKind, key: string, callback: (item: any) => void): void {
    this.doGet(kind, key, (item) => {
      if (item && !item.deleted) {
        callback(item);
      } else {
        callback(null);
      }
    });
  }

  public getAllInternal(kind: DataKind, callback: (items: KeyedItems) => void): void {
    if (!this.state.connected && !this.state.initialConnect) {
      this.logger.warn("Attempted to fetch all keys while Redis connection is down");
      callback(null);
      return;
    }

    this.client.hgetall(this.itemsKey(kind), (err, obj) => {
      if (err) {
        this.logger.error(`Error fetching "${kind.namespace}" from Redis`, err);
        callback(null);
      } else {
        const results = {};
        const items = obj;
        for (const [key, serializedData] of Object.entries(items)) {
          results[key] = JSON.parse(serializedData);
        }
        callback(results);
      }
    });
  }

  public initInternal(allData: FullDataSet, callback: () => void): void {
    const multi = this.client.multi();

    for (const [kindNamespace, items] of Object.entries(allData)) {
      const kind = dataKind[kindNamespace];
      const baseKey = this.itemsKey(kind);
      const stringified = {};
      multi.del(baseKey);
      for (const [key, item] of Object.entries(items)) {
        stringified[key] = JSON.stringify(item);
      }
      // Redis does not allow hmset() with an empty object
      if (Object.keys(stringified).length > 0) {
        multi.hmset(baseKey, stringified);
      }
    }

    multi.set(this.initedKey, "");

    multi.exec((err) => {
      if (err) {
        this.logger.error("Error initializing Redis store", err);
      }
      callback();
    });
  }

  public upsertInternal(kind: DataKind, item: any, callback: (err: Error, finalItem: any) => void): void {
    this.updateItemWithVersioning(kind, item, (err, attemptedWrite) => {
      if (err) {
        this.logger.error(`Error upserting key ${item.key} in "${kind.namespace}"`, err); // eslint-disable-line quotes
      }
      callback(err, attemptedWrite);
    });
  }

  public initializedInternal(callback: (result: boolean) => void): void {
    this.client.exists(this.initedKey, (err, obj) => {
      callback(!err && !!obj);
    });
  }

  public close() {
    if (this.state.stopClientOnClose) {
      this.client.quit();
    }
  }

  private itemsKey(kind: DataKind): string {
    return this.prefix + kind.namespace;
  }

  private doGet(kind: DataKind, key: string, callback: (item: any) => void): void {
    if (!this.state.connected && !this.state.initialConnect) {
      this.logger.warn(`Attempted to fetch key "${key}" while Redis connection is down`);
      callback(null);
      return;
    }

    this.client.hget(this.itemsKey(kind), key, (err, obj) => {
      if (err) {
        this.logger.error(`Error fetching key "${key}" from Redis in "${kind.namespace}"`, err);
        callback(null);
      } else {
        const item = JSON.parse(obj);
        callback(item);
      }
    });
  }

  private updateItemWithVersioning(kind: DataKind, newItem: any, callback: (err: Error, finalItem: any) => void): void {
    this.client.watch(this.itemsKey(kind));
    const multi = this.client.multi();
    // testUpdateHook is instrumentation, used only by the unit tests
    const prepare =
      this.testUpdateHook ||
      ((prepareCb) => prepareCb());
    prepare(() => {
      this.doGet(kind, newItem.key, (oldItem) => {
        if (oldItem && oldItem.version >= newItem.version) {
          multi.discard();
          callback(null, oldItem);
        } else {
          multi.hset(this.itemsKey(kind), newItem.key, JSON.stringify(newItem));
          multi.exec((err, replies) => {
            if (!err && replies === null) {
              // This means the EXEC failed because someone modified the watched key
              this.logger.debug("Concurrent modification detected, retrying");
              this.updateItemWithVersioning(kind, newItem, callback);
            } else {
              callback(err, newItem);
            }
          });
        }
      });
    });
  }
}
