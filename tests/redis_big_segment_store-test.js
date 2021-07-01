const { RedisBigSegmentStore } = require('../index');
const { runBigSegmentStoreTests } = require('launchdarkly-node-server-sdk/sharedtest/store_tests');
const redis = require('redis');
const { promisify } = require('util');

describe('RedisBigSegmentStore', () => {
  const redisOpts = { url: 'redis://localhost:6379' };

  const client = redis.createClient(redisOpts);

  function createStore(prefix, logger) {
    return RedisBigSegmentStore({ redisOpts, prefix })({ logger });
  }

  async function clearAllData(prefix) {
    const keys = await promisify(client.keys.bind(client))(prefix + ':*');
    for (const key of keys) {
      await promisify(client.del.bind(client))(key);
    }
  }

  async function setMetadata(prefix, metadata) {
    await promisify(client.set.bind(client))(prefix + ':big_segments_synchronized_on',
        metadata.lastUpToDate ? metadata.lastUpToDate.toString() : '');
  }

  async function setSegments(prefix, userHashKey, includes, excludes) {
    for (const ref of includes) {
      await promisify(client.sadd.bind(client))(prefix + ':big_segment_include:' + userHashKey, ref);
    }
    for (const ref of excludes) {
      await promisify(client.sadd.bind(client))(prefix + ':big_segment_exclude:' + userHashKey, ref);
    }
  }

  runBigSegmentStoreTests(
    createStore,
    clearAllData,
    setMetadata,
    setSegments,
  );

  afterAll(() => {
    client.quit();
  });
});
