'use strict';

const redis = require('redis');
const { Debug, Err } = require('../../lib/logger');

class Redis {
  constructor(config) {
    this.client = null;
    this.config = config;
    this.config.socket['reconnectStrategy'] = (retry) => {
      Debug(`Retry to connect № ${retry}, delay 1s`);
      return 1000;
    };
  }

  async connect() {
    const client = redis.createClient(this.config);
    this.client = client;
    client.on('error', (error) => {
      Err(error);
    });
    client.on('ready', () => {
      if (client !== this.client) return;
    });
    await client.connect();
  }
}

module.exports = Redis;
