# redis-wrapper

Has two classes simple redis wrapper `Redis` and pub/sub wrapper `RedisPubSub` (only for pub/sub).

## Requirements

No additional requirents, except packages in `package.json`

### Constructor arguments

#### Redis

- default redis config + name field, which is used in logging purposes

#### RedisPubSub

- default redis config

### Example

```javascript

'use strict';

const { Redis, RedisPubSub } = require('redis-wrapper');

(async () => {
  const redis = new Redis({ // full redis client 
    ...redisConfig,
    name: 'redis_client'  // shows up in logs
  });
  await redis.connect();
  redis.client.exists('check');
  
  const pubSub = new RedisPubSub(redisConfig);
  await pubSub.connect();
  pubSub.subscribe('channel', (msg) => console.log(msg);
})();

```
