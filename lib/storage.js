var redis = require('redis');
var settings = require('../settings.json');

module.exports = class Storage {
  constructor() {
    if (settings.redis_port && settings.redis_ip) {
      this._client = redis.createClient(settings.redis_port, settings.redis_ip);
    } else {
      this._client = redis.createClient();
    }

    this._client.on('error', (err) => console.log(`[error] Redis ${err}`));
    this._client.on("connect", () => console.log("Redis connected"));
  }

  logCommand(user) {
    this._client.zincrby("commands", 1, user.username);
  }

  getCommandLog(cb) {
    this._client.zrevrange("commands", 0, 4, "withscores", (err, obj) => {
      if (err) {
        console.log(err);
      } else {
        let message = "Command toplist: \n ```";
        let placement = 1;
        for (let i = 0; i < obj.length; i++) {
          message += `${placement}. ${obj[i]}, ${obj[i+1]} commands \n`;
          i++;
          placement++;
        }
        message += "```";
        cb(message);
      }
    });
  }

  storeTrackUrl(url) {
    this._client.sadd("url", url);
  }

  getRandomUrl(cb) {
    this._client.srandmember("url", (err, obj) => {
      if (err) {
        console.log(err);
      } else {
        cb(obj);
      }
    });
  }
}
