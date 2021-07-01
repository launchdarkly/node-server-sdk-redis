const base = require('./redis_base');
const { promisify } = require('util');

function RedisBigSegmentStore(options) {
  return config => bigSegmentStoreImpl(options || {}, config.logger);
  // Note, config.logger is guaranteed to be defined - the SDK will have provided a default one if necessary
}

function bigSegmentStoreImpl(options, logger) {
  const state = base.initState(options, logger);
  const client = state.client;
  const prefix = state.prefix;

  const store = {};

  // Pre-promisify these methods for efficiency. Note that we have to add .bind(client) to each method
  // when using promisify, because the redis client methods don't work without a "this" context.
  const clientGet = promisify(client.get.bind(client));
  const clientSmembers = promisify(client.smembers.bind(client));

  store.getMetadata = async () => {
    const value = await clientGet(prefix + ':big_segments_synchronized_on');
    return { lastUpToDate: value === null || value === undefined || value === '' ? undefined : parseInt(value) };
  };

  store.getUserMembership = async userHash => {
    const includedRefs = await promisify(clientSmembers)(prefix + ':big_segment_include:' + userHash);
    const excludedRefs = await promisify(clientSmembers)(prefix + ':big_segment_exclude:' + userHash);
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
  };

  store.close = () => {
    if (state.stopClientOnClose) {
      client.quit();
    }
  };

  return store;
}

module.exports = RedisBigSegmentStore;
