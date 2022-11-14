'use strict';

const redis = require('redis');
const { Info, Err } = require('logger');

class Redis {
  constructor(config) {
    this.client = null;
    this.config = config;
    this.name = config?.name;
    this.config.socket['reconnectStrategy'] = (retry) => {
      Info(`Retry to connect № ${retry}, delay 1s`);
      return 1000;
    };
  }

  async connect() {
    const client = redis.createClient(this.config);
    this.client = client;
    client.on('error', (error) => {
      Err(error);
    });
    client.on('connect', () => Info(`Redis: ${this?.name} connected`));
    client.on('ready', () => {
      if (client !== this.client) return;
    });
    await client.connect();
  }
}

module.exports = Redis;
