'use strict';

const redis = require('redis');
const { Debug, Info, Err } = require('logger');
const { EventEmitter } = require('node:events');

const delayMs = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    client.on('ready', () => {
      if (client !== this.client) return;
      Info(`Redis: ${this?.name} connected`);
    });
    await client.connect();
  }
}

class RedisPubSub extends EventEmitter {
  #subscribeMap = new Map();
  #client = null;
  constructor(config) {
    super();
    this.setMaxListeners(Number.POSITIVE_INFINITY);
    if (!config) throw new Error('Redis config must be declared');
    this.config = config;
    this.config.socket['reconnectStrategy'] = () => {
      return new Error('No reconnect!');
    };
  }

  async subscribe(channel, callback) {
    await this.#client.subscribe(channel, callback);
    if (!this.#subscribeMap.has(channel))
      this.#subscribeMap.set(channel, new Set());
    this.#subscribeMap.get(channel).add(callback);
  }

  async unsubscribe(channel, callback) {
    await this.#client.unsubscribe(channel, callback);
    this.#subscribeMap.get(channel).delete(callback);
  }

  async publish(chanel, message) {
    let ret;
    try {
      ret = await this.#client.publish(chanel, message);
    } catch (err) {
      Err('Error during publish', err);
    } finally {
      return ret;
    }
  }

  async #reconnect() {
    this.emit('reconnecting');
    await delayMs(1000);
    await this.connect();
  }

  async #createClient() {
    return new Promise(async (resolve, reject) => {
      const client = redis.createClient(this.config);
      this.#client = client;
      client.on('ready', () => {
        if (client !== this.#client) {
          for (const [channel, callbacks] of this.#subscribeMap.entries()) {
            for (const callback of callbacks)
              client.unsubscribe(channel, callback);
          }
          client.disconnect();
        } else {
          for (const [channel, callbacks] of this.#subscribeMap.entries()) {
            for (const callback of callbacks)
              this.#client.subscribe(channel, callback);
          }
          this.emit('connected');
          resolve();
        }
      });
      client.on('error', async (error) => {
        Err(error);
        if (
          error.message === 'Socket closed unexpectedly' ||
          error.message.includes('connect')
        ) {
          this.#reconnect().then(resolve).catch(reject);
        } else reject(error);
      });
      try {
        await client.connect();
      } catch (error) {
        if (error.message === 'No reconnect!') {
          Debug('Catching reconnect error from old client');
        } else reject(error);
      }
    });
  }

  async connect() {
    return new Promise(async (resolve, reject) => {
      try {
        await this.#createClient();
        resolve();
      } catch (error) {
        Err(error);
        reject(error);
      }
    });
  }
}

module.exports = {
  Redis,
  RedisPubSub,
};
