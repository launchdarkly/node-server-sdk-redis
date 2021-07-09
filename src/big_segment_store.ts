import { BaseRedis } from "./base";
import { LDRedisOptions } from "./options";

import * as ld from "launchdarkly-node-server-sdk";
import { RedisClient } from "redis";
import { promisify } from "util";

export const keyLastUpToDate = "big_segments_synchronized_on";
export const keyUserInclude = "big_segment_include:";
export const keyUserExclude = "big_segment_exclude:";

/**
 * Configures a big segment store backed by a Redis instance.
 *
 * "Big segments" are a specific type of user segments. For more information, read the
 * LaunchDarkly documentation about user segments: https://docs.launchdarkly.com/home/users
 *
 * @param options The standard options supported for all LaunchDarkly Redis features, including both
 *   options for Redis itself and others related to the SDK's behavior.
 */
export function RedisBigSegmentStore(options?: LDRedisOptions):
    (config: ld.LDOptions) => ld.interfaces.BigSegmentStore {
  return (config) => new BigSegmentStoreImpl(options || {}, config.logger);
}

class BigSegmentStoreImpl implements ld.interfaces.BigSegmentStore {
  private state: BaseRedis;
  private client: RedisClient;
  private prefix: string;

  // Pre-promisify these methods for efficiency
  private clientGet: (key: string) => Promise<string>;
  private clientSmembers: (key: string) => Promise<string[]>;

  public constructor(options: LDRedisOptions, logger: ld.LDLogger) {
    this.state = new BaseRedis(options, logger);
    this.client = this.state.client;
    this.prefix = this.state.prefix;

    this.clientGet = promisify(this.client.get.bind(this.client));
    this.clientSmembers = promisify(this.client.smembers.bind(this.client));
  }

  public async getMetadata(): Promise<ld.interfaces.BigSegmentStoreMetadata> {
    const value = await this.clientGet(this.prefix + keyLastUpToDate);
    return {
      lastUpToDate: value === null || value === undefined || value === "" ? undefined : parseInt(value, 10),
    };
  }

  public async getUserMembership(userHash: string): Promise<ld.interfaces.BigSegmentStoreMembership> {
    const includedRefs = await this.clientSmembers(this.prefix + keyUserInclude + userHash);
    const excludedRefs = await this.clientSmembers(this.prefix + keyUserExclude + userHash);
    if ((!includedRefs || !includedRefs.length) && (!excludedRefs || !excludedRefs.length)) {
      return null;
    }
    const membership = {};
    if (excludedRefs) {
      for (const ref of excludedRefs) {
        membership[ref] = false;
      }
    }
    if (includedRefs) {
      for (const ref of includedRefs) {
        membership[ref] = true;
      }
    }
    return membership;
  }

  public close() {
    if (this.state.stopClientOnClose) {
      this.client.quit();
    }
  }
}
