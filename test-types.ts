
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our index.d.ts file.

import { RedisFeatureStore } from 'launchdarkly-node-server-sdk-redis';
import { LDLogger } from 'launchdarkly-node-server-sdk';
import * as redis from 'redis';

var logger: LDLogger = { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} };

var redisStore0 = RedisFeatureStore();
var myRedisOpts: redis.ClientOpts = {};
var redisStore1 = RedisFeatureStore(myRedisOpts, 30, 'prefix', logger);
var myRedisClient: redis.RedisClient = new redis.RedisClient(myRedisOpts);
var redisStore2 = RedisFeatureStore(undefined, 30, 'prefix', logger, myRedisClient);
