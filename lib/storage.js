const redis = require('redis');
const settings = require('../settings.json');

module.exports = class Storage {
  constructor() {
    if (settings.redis_port && settings.redis_ip) {
      this.client = redis.createClient(settings.redis_port, settings.redis_ip);
    } else {
      this.client = redis.createClient();
    }

    this.client.on('error', (err) => console.error(`[error] Redis ${err}`));
    this.client.on('connect', () => console.log('Redis connected'));
  }

  logCommand(user) {
    this.client.zincrby('commands', 1, user.username);
  }

  getCommandLog(cb) {
    this.client.zrevrange('commands', 0, 4, 'withscores', (err, obj) => {
      if (err) {
        console.error(err);
      } else {
        let message = 'Command toplist: \n ```';
        let placement = 1;
        for (let i = 0; i < obj.length; i++) {
          message += `${placement}. ${obj[i]}, ${obj[i + 1]} commands \n`;
          i++;
          placement++;
        }
        message += '```';
        cb(message);
      }
    });
  }

  storeTrackUrl(url) {
    this.client.sadd('url', url);
  }

  getRandomUrl(cb) {
    this.client.srandmember('url', (err, obj) => {
      if (err) {
        console.error(err);
      } else {
        cb(obj);
      }
    });
  }
};
