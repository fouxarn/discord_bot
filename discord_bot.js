const http = require('http');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const settings = require('./settings.json');
const Storage = require('./lib/storage.js');

const bot = new Discord.Client({
  autoReconnect: true,
});
const store = new Storage();

let queue = [];
let playing = false;
let nowPlaying;

const commands = {
  ping: {
    description: 'Responds pong',
    process: (bot, message) => {
      bot.sendMessage(message.channel, `${message.sender} pong!`);
    },
  },

  winner: {
    usage: '[username]',
    description: 'Chooses a lucky winner between online members of the server',
    process: (bot, message) => {
      const winner = randomUser(message.channel.server);
      bot.sendMessage(message.channel, `${winner} is the lucky winner!`);
    },
  },

  roll: {
    description: 'Rolls a random number',
    process: (bot, message) => {
      const roll = Math.floor(Math.random() * 10) + 1;
      bot.sendMessage(message.channel, `I rolled ${roll}, gz or something`);
    },
  },

  queue: {
    usage: '[youtube-url] or [random]',
    description: 'Add audio from a youtube link to the queue',
    channel: getBotChannelName(),
    process: (bot, message, args) => {
      if (args.length === 0) {
        bot.sendMessage(message.channel, 'You have to bring a link with the command');
      } else {
        playing = true;
        if (args[0] === 'random') {
          store.getRandomUrl((url) => {
            addToQueue(url, message);
          });
        } else {
          addToQueue(args[0], message);
          store.storeTrackUrl(args[0]);
        }
      }
    },
  },

  listqueue: {
    description: 'List all the songs in queue',
    channel: getBotChannelName(),
    process: (bot, message) => {
      listQueue(message.channel);
    },
  },

  clearqueue: {
    description: 'Clears the queue and stops the music',
    channel: getBotChannelName(),
    process: (bot, message) => {
      clearQueue(message);
    },
  },

  stop: {
    description: 'Stops playing',
    channel: getBotChannelName(),
    process: (bot, message) => {
      stopPlaying(message);
    },
  },

  start: {
    description: 'Starts with next song in the queue',
    channel: getBotChannelName(),
    process: () => {
      playing = true;
    },
  },

  playing: {
    description: 'Prints wants playing right now',
    channel: getBotChannelName(),
    process: (bot, message) => {
      let msg;
      if (nowPlaying) {
        msg = 'Now playing:\n\n ' +
            `${nowPlaying.title} by ${nowPlaying.author}, [${nowPlaying.view_count}] views, ${nowPlaying.length_seconds} seconds`;
      } else {
        msg = 'Not playing anything at the moment';
      }
      bot.sendMessage(message.channel, msg);
    },
  },

  skip: {
    description: 'Skip to the next song in queue',
    channel: getBotChannelName(),
    process: (bot) => {
      playNextTrack();
    },
  },

  join: {
    usage: '[channel_id]',
    description: 'Selects in which channel the bot should live',
    channel: getBotChannelName(),
    process: (bot, message, args) => {
      bot.joinVoiceChannel(args[0], (error) => {
        console.log(error.message);
      });
    },
  },

  cat: {
    description: 'I will give you my favorite cat image <3',
    process: (bot, message) => {
      bot.sendFile(message, 'http://placekitten.com/' + (Math.floor((Math.random() * 900) + 100) + '/' + Math.floor((Math.random() * 900) + 100)), 'cat.png', (err) => {
        if (err) {
          console.log('couldn\'t send image:', err);
        }
      });
    },
  },

  joinme: {
    description: 'Join the channel of the user',
    channel: getBotChannelName(),
    process: (bot, message) => {
      if (message.author.voiceChannel) {
        bot.joinVoiceChannel(message.author.voiceChannel, (error) => {
          console.log(error.message);
        });
      }
    },
  },

  leave: {
    description: 'Makes the bot leave the channel',
    channel: getBotChannelName(),
    process: (bot, message) => {
      bot.leaveVoiceChannel(bot.voiceConnection.voiceChannel);
    }
  },

  power: {
    description: 'BRAINPOWER!',
    process: (bot, message) => {
      bot.sendMessage(message.channel, 'O-oooooooooo AAAAE-A-A-I-A-U- JO-oooooooooooo AAE-O-A-A-U-U-A- E-eee-ee-eee AAAAE-A-E-I-E-A-JO-ooo-oo-oo-oo EEEEO-A-AAA-AAAA');
    }
  },

  toplist: {
    description: 'Prints usage toplist',
    process: (bot, message) => {
      store.getCommandLog((string) => {
        bot.sendMessage(message.channel, string);
      });
    },
  },

  joke: {
    description: 'I will tell a funny joke about a random user',
    process: (bot, message) => {
      const winner = randomUser(message.channel.server);
      const options = {
        host: 'api.icndb.com',
        path: `/jokes/random?firstName=${winner.username}&lastName=`
      };

      http.request(options, (response) => {
        let str = '';
        response.on('data', (chunk) => {
          str += chunk;
        });
        response.on('end', () => {
          const joke = JSON.parse(str).value.joke;
          bot.sendMessage(message.channel, joke.replace(/&quot;/g, '"'));
        });
      }).end();
    },
  },
};

bot.on('ready', () => {
  console.log('Ready! Serving on " + bot.servers.length + " servers :)');
  bot.setPlayingGame('with your feelings');
  bot.servers.forEach((server) => {
    if (server.channels.get('name', getBotChannelName(bot)) === null) {
      console.log(`The channel "${getBotChannelName(bot)}" doesn't exist on server ${server.name}`);
    }
  });
  checkQueue();
});

bot.on('message', (message) => {
  if (message.author.id !== bot.user.id && message.content[0] === settings.botPrefix) {
    console.log('Treating ' + message.content + ' from ' + message.author.username + ' as a command.');
    const command = message.content.substring(1).split(' ');
    const cmd = commands[command[0]];

    if (command[0] === 'help') {
      printCommands(message.channel);
    } else if (cmd) {
      try {
        if (cmd.channel === undefined || cmd.channel === message.channel.name) {
          command.shift();
          cmd.process(bot, message, command);
          store.logCommand(message.author);
        }
      } catch (e) {
        bot.sendMessage(message.channel, 'And it was at that moment Daniel knew, he fucked up');
        console.error(e.stack);
      }
    }
  }
});

function printCommands(channel) {
  let msg = 'Available Commands: \n ```';
  for (let cmd in commands) {
    msg += settings.botPrefix + cmd;
    const usage = commands[cmd].usage;
    if (usage) {
      msg += ` ${usage}`;
    }
    const restricted = commands[cmd].channel;
    if (restricted) {
      msg += ` (in #${restricted})`;
    }
    const description = commands[cmd].description;
    if (description) {
      msg += `\n\t${description}`;
    }
    msg += '\n\n';
  }
  msg += '```';
  bot.sendMessage(channel, msg);
}

function getBotChannelName() {
  return (settings.musicChannel).toLowerCase();
}

function checkQueue() {
  if (playing && !queueEmpty() && !bot.voiceConnection.playing) {
    playNextTrack();
  }

  setTimeout(checkQueue, 5000);
}

function addToQueue(videoID, message) {
  ytdl.getInfo(videoID, (error, info) => {
    if (error) {
      console.log(error);
      bot.reply(message, 'There was a problem adding the video.');
    } else {
      const track = {
        title: info.title,
        author: info.author,
        view_count: info.view_count,
        length_seconds: info.length_seconds,
        info,
      };
      queue.push(track);
      bot.reply(message, 'Added song to queue! :)');
    }
  });
}

function listQueue(channel) {
  let message = 'Songqueue: \n ```';
  queue.forEach((track, index) => {
    message += `${index}. ${track.title} by ${track.author}, [${track.view_count}] views, ${track.length_seconds} seconds\n\n`;
  });
  message += '```';
  bot.sendMessage(channel, message);
}

function playNextTrack() {
  if (queueEmpty()) {
    bot.voiceConnection.stopPlaying();
    return;
  }

  try {
    const options = {
      filter: (format) => format.container === 'mp4',
      quality: 'lowest',
    };
    const stream = ytdl.downloadFromInfo(queue[0].info, options);
    stream.on('error', (error) => {
      console.log(error);
    });
    nowPlaying = queue[0];

    bot.voiceConnection.playRawStream(stream, {
      volume: 0.2,
    });
  } catch (exception) {
    console.error(exception);
  }

  queue.splice(0, 1);
}

function stopPlaying(message) {
  bot.voiceConnection.stopPlaying();
  playing = false;
  bot.sendMessage(message, 'Stopped playing audio');
}

function clearQueue(message) {
  queue = [];
  bot.reply(message, 'The queue has been cleared!');
}

function queueEmpty() {
  return queue.length === 0;
}

function randomUser(server) {
  const users = server.members.getAll('status', 'online');
  const winner = Math.floor(Math.random() * users.length);
  return users[winner];
}

bot.loginWithToken(settings.token).catch((error) => {
  console.error(error);
});

// Handle discord.js warnings
bot.on('warn', (m) => console.warn('[warning]', m));
bot.on('debug', (m) => console.info('[debug]', m));

// Taget från https://github.com/meew0/Lethe/blob/master/lethe.js#L571
process.on('uncaughtException', (err) => {
    // Handle ECONNRESETs caused by `next` or `destroy`
  if (err.code === 'ECONNRESET') {
        // Yes, I'm aware this is really bad node code. However, the uncaught exception
        // that causes this error is buried deep inside either discord.js, ytdl or node
        // itself and after countless hours of trying to debug this issue I have simply
        // given up. The fact that this error only happens *sometimes* while attempting
        // to skip to the next video (at other times, I used to get an EPIPE, which was
        // clearly an error in discord.js and was now fixed) tells me that this problem
        // can actually be safely prevented using uncaughtException. Should this bother
        // you, you can always try to debug the error yourself and make a PR.
    console.error('Got an ECONNRESET! This is *probably* not an error. Stacktrace:');
    console.error(err.stack);
  } else {
        // Normal error handling
    console.error(err);
    console.error(err.stack);
    process.exit(0);
  }
});
