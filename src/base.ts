import { LDRedisOptions } from './options';

import { LDLogger } from 'launchdarkly-node-server-sdk';
import * as redis from 'redis';

export const defaultPrefix = 'launchdarkly';

export class BaseRedis {
  public prefix: string;
  public client: redis.RedisClient;
  public stopClientOnClose: boolean;
  public connected: boolean;
  public initialConnect: boolean;

  public constructor(options: LDRedisOptions, logger: LDLogger) {
    this.prefix = (options.prefix || defaultPrefix) + ':';

    if (options.client) {
      this.client = options.client;
      this.stopClientOnClose = false;
      this.connected = true;
    } else {
      this.client = redis.createClient(options.redisOpts);
      this.stopClientOnClose = true;
      this.connected = false;
    }

    this.initialConnect = !this.connected;

    // The reason we're attaching event handlers here to keep track of the connection state is that
    // if we give a command to the Redis client while the connection is down, rather than simply
    // failing it may decide to defer the command until the connection is up again. We don't want
    // to leave these operations hanging; we would rather fail fast. So we need to know if the
    // client is currently offline so we can avoid trying to do commands then.

    this.client.on('error', (err) => {
      // Note that we *must* have an error listener or else any connection error will trigger an
      // uncaught exception.
      logger.error(`Redis error - ${err}`);
    });

    this.client.on('reconnecting', (info) => {
      logger.info(`Attempting to reconnect to Redis (attempt #${info.attempt}, delay: ${info.delay}ms)`);
    });

    this.client.on('connect', () => {
      if (!this.initialConnect) {
        logger.warn('Reconnected to Redis');
      }
      this.initialConnect = false;
      this.connected = true;
    });

    this.client.on('end', () => {
      this.connected = false;
    });
  }
}
