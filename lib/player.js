const ytdl = require('ytdl-core');

module.exports = class Player {
  constructor() {
    this.queue = [];
    this.playing = false;
    this.nowPlaying = false;
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
      return 'Nothing in queue :(';
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
      console.log('empty');
      console.log(voiceConnection);
      if (voiceConnection) {
        console.log("FUCK YOU");
        voiceConnection.stopPlaying();
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
  }

  clear() {
    this.queue = [];
  }

  empty() {
    return this.queue.length === 0;
  }
};
