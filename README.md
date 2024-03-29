# LaunchDarkly Server-Side SDK for Node.js - Redis integration

# :warning: Important note

This integration in this does not work with version 8.0+ of the Node.js Server-Side SDK. Future development of this integration will be done here [node-server-sdk-redis](https://github.com/launchdarkly/js-core/tree/main/packages/store/node-server-sdk-redis). Please note the package has also been renamed from `launchdarkly-node-server-sdk-redis` to `@launchdarkly/node-server-sdk-redis`.

As mentioned in the [node server sdk changelog](https://github.com/launchdarkly/node-server-sdk/blob/main/CHANGELOG.md), the `launchdarkly-node-server-sdk` project has been renamed to `@launchdarkly/node-server-sdk`. All future releases will be made from the [new repository](https://github.com/launchdarkly/js-core/tree/main/packages/sdk/server-node). Please consider upgrading and filing potential requests in that repository's [issue tracker](https://github.com/launchdarkly/js-core/issues?q=is%3Aissue+is%3Aopen+label%3A%22package%3A+sdk%2Fserver-node%22+sort%3Aupdated-desc).

[![CircleCI](https://circleci.com/gh/launchdarkly/node-server-sdk-redis.svg?style=svg)](https://circleci.com/gh/launchdarkly/node-server-sdk-redis)

This library provides a Redis-backed persistence mechanism (feature store) for the [LaunchDarkly Node.js SDK](https://github.com/launchdarkly/node-server-sdk), replacing the default in-memory feature store. The underlying Redis client implementation is [Node Redis](https://www.npmjs.com/package/redis).

The minimum version of the LaunchDarkly Server-Side SDK for Node for use with this library is 6.2.0. In earlier versions of the SDK, the Redis integration was bundled in the main SDK package.

For more information, read [Using Redis as a persistent feature store](https://docs.launchdarkly.com/sdk/features/storing-data/redis#nodejs-server-side).

TypeScript API documentation is [here](https://launchdarkly.github.io/node-server-sdk-redis).

## Quick setup

This assumes that you have already installed the LaunchDarkly Node.js SDK.

1. Install this package with `npm`:

        npm install launchdarkly-node-server-sdk-redis --save

2. If your application does not already have its own dependency on the `redis` package, add `redis` as well:

        npm install redis --save

3. Require the package:

        const { RedisFeatureStore } = require('launchdarkly-node-server-sdk-redis');

4. When configuring your SDK client, add the Redis feature store:

        const store = RedisFeatureStore();
        const config = { featureStore: store };
        const client = LaunchDarkly.init('YOUR SDK KEY', config);

    By default, the store will try to connect to a local Redis instance on port 6379. You may specify an alternate configuration as described in the API documentation for `RedisFeatureStore`.

## Caching behavior

To reduce traffic to Redis, there is an optional in-memory cache that retains the last known data for a configurable amount of time. This is on by default; to turn it off (and guarantee that the latest feature flag data will always be retrieved from Redis for every flag evaluation), configure the store as follows:

        const store = RedisFeatureStore({ cacheTTL: 0 });

## About LaunchDarkly

* LaunchDarkly is a continuous delivery platform that provides feature flags as a service and allows developers to iterate quickly and safely. We allow you to easily flag your features and manage them from the LaunchDarkly dashboard.  With LaunchDarkly, you can:
    * Roll out a new feature to a subset of your users (like a group of users who opt-in to a beta tester group), gathering feedback and bug reports from real-world use cases.
    * Gradually roll out a feature to an increasing percentage of users, and track the effect that the feature has on key metrics (for instance, how likely is a user to complete a purchase if they have feature A versus feature B?).
    * Turn off a feature that you realize is causing performance problems in production, without needing to re-deploy, or even restart the application with a changed configuration file.
    * Grant access to certain features based on user attributes, like payment plan (eg: users on the ‘gold’ plan get access to more features than users in the ‘silver’ plan). Disable parts of your application to facilitate maintenance, without taking everything offline.
* LaunchDarkly provides feature flag SDKs for a wide variety of languages and technologies. Read [our documentation](https://docs.launchdarkly.com/sdk) for a complete list.
* Explore LaunchDarkly
    * [launchdarkly.com](https://www.launchdarkly.com/ "LaunchDarkly Main Website") for more information
    * [docs.launchdarkly.com](https://docs.launchdarkly.com/  "LaunchDarkly Documentation") for our documentation and SDK reference guides
    * [apidocs.launchdarkly.com](https://apidocs.launchdarkly.com/  "LaunchDarkly API Documentation") for our API documentation
    * [blog.launchdarkly.com](https://blog.launchdarkly.com/  "LaunchDarkly Blog Documentation") for the latest product updates
