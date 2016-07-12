const ytdl = require('ytdl-core');

module.exports = class Player {
  constructor(store) {
    this.queue = [];
    this.playing = false;
    this.nowPlaying = false;
    this.store = store;
    this.onRadio = false;
  }

  add(videoID, callback) {
    ytdl.getInfo(videoID, (error, info) => {
      if (error) {
        callback(error);
      } else {
        const track = {
          title: info.title,
          author: info.author,
          view_count: info.view_count,
          length_seconds: info.length_seconds,
          info,
        };
        this.queue.push(track);
        this.startPlaying();
        callback(null, track);
      }
    });
  }

  getList() {
    if (this.empty()) {
      return null;
    }
    let message = 'Songqueue: \n ```';
    this.queue.forEach((track, index) => {
      message += `${index}. ${track.title} by ${track.author},` +
        `[${track.view_count}] views, ${track.length_seconds} seconds\n\n`;
    });
    message += '```';
    return message;
  }

  playNextTrack(voiceConnection) {
    if (this.empty()) {
      if (this.onRadio) {
        this.queueRandom();
      }
      return;
    }

    try {
      const options = {
        filter: (format) => format.container === 'mp4',
        quality: 'lowest',
      };
      const stream = ytdl.downloadFromInfo(this.queue[0].info, options);
      stream.on('error', (error) => {
        console.log(error);
      });
      this.playing = true;
      this.nowPlaying = this.queue[0];

      voiceConnection.playRawStream(stream, {
        volume: 0.2,
      });
    } catch (exception) {
      console.error(exception);
    }

    this.queue.splice(0, 1);
  }

  startPlaying() {
    this.playing = true;
  }

  stopPlaying() {
    this.playing = false;
    this.nowPlaying = null;
    this.onRadio = false;
  }

  clear() {
    this.queue = [];
    this.onRadio = false;
  }

  empty() {
    return this.queue.length === 0;
  }

  queueRandom() {
    this.store.getRandomUrl((url) => {
      this.add(url, (error) => {
        if (error) {
          console.log(error);
        }
      });
    });
  }
};
