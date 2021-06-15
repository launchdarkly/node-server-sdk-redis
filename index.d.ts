// Type definitions for launchdarkly-node-server-sdk-redis

/**
 * Interface for the Redis feature store component to be used with the LaunchDarkly SDK.
 *
 * See: https://docs.launchdarkly.com/sdk/features/database-integrations
 */

declare module 'launchdarkly-node-server-sdk-redis' {
  import { LDFeatureStore, LDLogger, LDOptions } from 'launchdarkly-node-server-sdk';
  import { ClientOpts, RedisClient } from 'redis';

  /**
   * Configures a feature store backed by a Redis instance.
   *
   * For more details about how and why you can use a persistent feature store, see
   * the [SDK features guide](https://docs.launchdarkly.com/sdk/features/database-integrations).
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
  export default function RedisFeatureStore(
    redisOpts?: ClientOpts,
    cacheTTL?: number,
    prefix?: string,
    logger?: LDLogger | object,
    client?: RedisClient
  ): (config: LDOptions) => LDFeatureStore;
}
