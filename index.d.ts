// Type definitions for launchdarkly-node-server-sdk-redis

/**
 * Interface for the Redis feature store component to be used with the LaunchDarkly SDK.
 *
 * See: https://docs.launchdarkly.com/sdk/features/database-integrations
 */

declare module 'launchdarkly-node-server-sdk-redis' {
  import { LDFeatureStore, LDLogger, LDOptions } from 'launchdarkly-node-server-sdk';
  import * as ld from 'launchdarkly-node-server-sdk';
  import { ClientOpts, RedisClient } from 'redis';

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
   *     redisOpts: { host: 'redishost', port: 6379 },
   *     prefix: 'app1',
   *     cacheTTL: 30
   *   });
   * ```
   * 
   * The equivalent in the older syntax (which will be dropped in a future version) would be:
   * 
   * ```
   * const store = RedisFeatureStore(
   *   { host: 'redishost', port: 6379 },
   *   30,
   *   'app1'
   * );
   * ```
   * 
   * @param redisOpts
   *   Optional configuration parameters to be passed to the `redis` package.
   * @param cacheTTL
   *   The amount of time, in seconds, that recently read or updated items should remain in an
   *   in-memory cache. If it is zero, there will be no in-memory caching. The default value is DefaultCacheTTL.
   * @param prefix
   *   A string that should be prepended to all Redis keys used by the feature store.
   * @param logger
   *   A custom logger for warnings and errors. If not specified, it will use whatever the
   *   SDK's logging configuration is.
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
    logger?: LDLogger | object,
    client?: RedisClient
  ): (config: LDOptions) => LDFeatureStore;

  /**
   * Configures a big segment store backed by a Redis instance.
   * 
   * "Big segments" are a specific type of user segments. For more information, read the
   * LaunchDarkly documentation about user segments: https://docs.launchdarkly.com/home/users
   *
   * @param options The standard options supported for all LaunchDarkly Redis features, including both
   *   options for Redis itself and others related to the SDK's behavior.
   */
  export function RedisBigSegmentStore(
    options?: LDRedisOptions
  ): (config: LDOptions) => ld.interfaces.BigSegmentStore;

  /**
   * The standard options supported for the LaunchDarkly Redis integration.
   */
  export interface LDRedisOptions {
    /**
     * Optional configuration parameters to be passed to the `redis` package that handles communication
     * with the Redis server.
     * 
     * This includes properties such as `host` and `port`. For more details, see:
     * https://github.com/NodeRedis/node-redis
     * 
     * If you leave this property empty, the default is to connect to `localhost:6379`.
     */
     redisOpts?: ClientOpts,

     /**
     * A string that will be prepended to all Redis keys used by the SDK.
     */
    prefix?: string,

    /**
     * Set this property if you already have a Redis client instance that you wish to reuse. In this
     * case, `redisOpts` will be ignored.
     */
    client?: RedisClient,

    /**
     * The amount of time, in seconds, that recently read or updated items should remain in an
     * in-memory cache. If it is zero, there will be no in-memory caching.
     */
    cacheTTL?: number
  }
}
