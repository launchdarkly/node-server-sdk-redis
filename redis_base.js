const redis = require('redis');

const defaultPrefix = 'launchdarkly';

function initState(options, logger) {
  const state = {
    prefix: options.prefix || defaultPrefix
  };

  if (options.client) {
    state.client = options.client;
    state.stopClientOnClose = false;
    state.connected = true;
  } else {
    state.client = redis.createClient(options.redisOpts);
    state.stopClientOnClose = true;
    state.connected = false;
  }

  state.initialConnect = !state.connected;

  // The reason we're attaching event handlers here to keep track of the connection state is that
  // if we give a command to the Redis client while the connection is down, rather than simply
  // failing it may decide to defer the command until the connection is up again. We don't want
  // to leave these operations hanging; we would rather fail fast. So we need to know if the
  // client is currently offline so we can avoid trying to do commands then.

  state.client.on('error', err => {
    // Note that we *must* have an error listener or else any connection error will trigger an
    // uncaught exception.
    logger.error('Redis error - ' + err);
  });

  state.client.on('reconnecting', info => {
    logger.info('Attempting to reconnect to Redis (attempt #' + info.attempt + ', delay: ' + info.delay + 'ms)');
  });

  state.client.on('connect', () => {
    if (!state.initialConnect) {
      logger.warn('Reconnected to Redis');
    }
    state.initialConnect = false;
    state.connected = true;
  });

  state.client.on('end', () => {
    state.connected = false;
  });

  return state;
}

module.exports = {
  initState,
};

