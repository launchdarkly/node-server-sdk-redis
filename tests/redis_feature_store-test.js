const RedisFeatureStore = require('../redis_feature_store');
const testBase = require('launchdarkly-node-server-sdk/test/feature_store_test_base');
const redis = require('redis');

function stubLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

describe('RedisFeatureStore', () => {
  const redisOpts = { url: 'redis://localhost:6379' };

  const extraRedisClient = redis.createClient(redisOpts);

  const sdkConfig = { logger: stubLogger() };

  function makeCachedStore() {
    return RedisFeatureStore(redisOpts, 30)(sdkConfig);
  }

  function makeUncachedStore() {
    return RedisFeatureStore(redisOpts, 0)(sdkConfig);
  }

  function makeStoreWithPrefix(prefix) {
    return RedisFeatureStore(redisOpts, 0, prefix)(sdkConfig);
  }

  function clearExistingData(callback) {
    extraRedisClient.flushdb(callback);
  }

  testBase.baseFeatureStoreTests(makeCachedStore, clearExistingData, true);
  testBase.baseFeatureStoreTests(makeUncachedStore, clearExistingData, false, makeStoreWithPrefix);

  testBase.concurrentModificationTests(makeUncachedStore,
    hook => {
      const store = makeCachedStore();
      store.underlyingStore.testUpdateHook = hook;
      return store;
    });

  afterAll(() => {
    extraRedisClient.quit();
  });
});
