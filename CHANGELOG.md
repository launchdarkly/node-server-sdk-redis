# Change log

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org).

## [2.1.0] - 2022-12-07
### Added:
- Added support for `launchdarkly-node-server-sdk` `7.0.0` and greater.

## [2.0.0] - 2021-07-22
### Added:
- Added support for Big Segments. An Early Access Program for creating and syncing Big Segments from customer data platforms is available to enterprise customers.
- Added a new way of calling `RedisFeatureStore()` using named properties in an options object, rather than positional parameters. This is the new preferred usage. For instance:

```js
// OLD:
const redisStore = RedisFeatureStore({ port: 7000}, 15, &#39;env1&#39;);

// NEW:
const redisStore = RedisFeatureStore({
  redisOpts: { port: 7000 },
  cacheTTL: 15,
  prefix: &#39;env1&#39;,
});
```

### Changed:
- `RedisFeatureStore` is now a named export, not a default export. This breaking change was made because the package now has an additional named export (`RedisBigSegmentStore`). There are no other backward-incompatible changes in the package.

To update existing code for this version, change your imports like so:

```js
// BEFORE:
// CommonJS style
const RedisFeatureStore = require(&#39;launchdarkly-node-server-sdk-redis&#39;);
// or ES6 style
import RedisFeatureStore from &#39;launchdarkly-node-server-sdk-redis&#39;;

// AFTER:
// CommonJS style
const { RedisFeatureStore } = require(&#39;launchdarkly-node-server-sdk-redis&#39;);
// or ES6 style
import { RedisFeatureStore } from &#39;launchdarkly-node-server-sdk-redis&#39;;
```

## [1.0.0] - 2021-06-17
Initial release of `launchdarkly-node-server-sdk-redis`. This is the Redis integration for version 6.x of the LaunchDarkly server-side SDK for Node.js. An equivalent Redis integration was bundled in versions 5.x and earlier of the SDK.
