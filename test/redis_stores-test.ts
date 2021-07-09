import { keyLastUpToDate, keyUserExclude, keyUserInclude } from "../src/big_segment_store";
import { RedisFeatureStoreImpl } from "../src/feature_store";
import { RedisBigSegmentStore, RedisFeatureStore } from "../src/index";

import * as ld from "launchdarkly-node-server-sdk";
import {
  runBigSegmentStoreTests,
  runPersistentFeatureStoreTests,
} from "launchdarkly-node-server-sdk/sharedtest/store_tests";

import { createClient, RedisClient } from "redis";
import { promisify } from "util";

// Runs the standard test suites provided by the SDK's store_tests module.

// This is a single file because if the two test suites were run from separate files, they could
// be interleaved by Jest. Since our implementation of clearAllData is not very smart and will
// remove *all* keys with the given prefix, we could step on another test's data if the shared
// test suites happen to use the same prefix.

function clearAllData(client: RedisClient) {
  return async (prefix: string) => {
    const keys = await promisify(client.keys.bind(client))(prefix + ":*");
    for (const key of keys) {
      await promisify(client.del.bind(client))(key);
    }
  };
}

describe("RedisFeatureStore", () => {
  const redisOpts = { url: "redis://localhost:6379" };

  const client = createClient(redisOpts);

  function createStore(prefix: string, cacheTTL: number, logger: ld.LDLogger) {
    return RedisFeatureStore({ redisOpts, cacheTTL, prefix })({ logger });
  }

  function createStoreWithConcurrentUpdateHook(
    prefix: string,
    logger: ld.LDLogger,
    hook: (callback: () => void) => void,
  ) {
    const store = createStore(prefix, 0, logger);
    ((store as any).underlyingStore as RedisFeatureStoreImpl).testUpdateHook = hook;
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

describe("RedisBigSegmentStore", () => {
  const redisOpts = { url: "redis://localhost:6379" };

  const client = createClient(redisOpts);

  function createStore(prefix: string, logger: ld.LDLogger) {
    return RedisBigSegmentStore({ redisOpts, prefix })({ logger });
  }

  async function setMetadata(prefix: string, metadata: ld.interfaces.BigSegmentStoreMetadata) {
    await promisify(client.set.bind(client))(prefix + ":" + keyLastUpToDate,
      metadata.lastUpToDate ? metadata.lastUpToDate.toString() : "");
  }

  async function setSegments(prefix: string, userHashKey: string, includes: string[], excludes: string[]) {
    for (const ref of includes) {
      await promisify(client.sadd.bind(client))(prefix + ":" + keyUserInclude + userHashKey, ref);
    }
    for (const ref of excludes) {
      await promisify(client.sadd.bind(client))(prefix + ":" + keyUserExclude + userHashKey, ref);
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
