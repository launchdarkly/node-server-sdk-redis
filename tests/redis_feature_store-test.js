const { RedisFeatureStore } = require('../index');
const { runPersistentFeatureStoreTests } = require('launchdarkly-node-server-sdk/sharedtest/store_tests');
const redis = require('redis');
const { promisify } = require('util');

describe('RedisFeatureStore', () => {
  const redisOpts = { url: 'redis://localhost:6379' };

  const client = redis.createClient(redisOpts);

  function createStore(prefix, cacheTTL, logger) {
    return RedisFeatureStore({ redisOpts, cacheTTL, prefix })({ logger });
  }

  async function clearAllData(prefix) {
    const keys = await promisify(client.keys.bind(client))(prefix + ':*');
    for (const key of keys) {
      await promisify(client.del.bind(client))(key);
    }
  }

  function createStoreWithConcurrentUpdateHook(prefix, logger, hook) {
    const store = createStore(prefix, 0, logger);
    store.underlyingStore.testUpdateHook = hook;
    return store;
  }

  runPersistentFeatureStoreTests(
    createStore,
    clearAllData,
    createStoreWithConcurrentUpdateHook,
  );

  afterAll(() => {
    client.quit();
  });
});
