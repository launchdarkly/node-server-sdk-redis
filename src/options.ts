import { ClientOpts, RedisClient } from 'redis';

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
  redisOpts?: ClientOpts;

  /**
   * A string that will be prepended to all Redis keys used by the SDK.
   */
  prefix?: string;

  /**
   * Set this property if you already have a Redis client instance that you wish to reuse. In this
   * case, `redisOpts` will be ignored.
   */
  client?: RedisClient;

  /**
   * The amount of time, in seconds, that recently read or updated items should remain in an
   * in-memory cache. If it is zero, there will be no in-memory caching.
   *
   * This parameter applies only to [[RedisFeatureStore]]. It is ignored for [[RedisBigSegmentStore]].
   * Caching for [[RedisBigSegmentStore]] is configured separately, in the SDK's
   * `LDBigSegmentsOptions` type, since it is independent of what database implementation is used.
   */
  cacheTTL?: number;
}
