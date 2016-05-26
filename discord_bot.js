var Discord = require('discord.js');
var settings = require('./settings.json');
var ytdl = require('ytdl-core');

var bot = new Discord.Client({autoReconnect: true});

let queue = [];
let playing = false;

var commands = {
    "ping": {
        description: "Responds pong",
        process: function(bot, message, args) {
            bot.sendMessage(message.channel, message.sender + " pong!");
        }
    },

    "winner": {
        usage: "[username]",
        description: "Chooses a lucky winner between online members of the server",
        process: function(bot, message, args) {
            var users = message.channel.server.members.getAll("status", "online");
            var winner = Math.floor(Math.random() * users.length);
            bot.sendMessage(message.channel, users[winner] + " is the lucky winner!");
        }
    },

    "roll": {
        description: "Rolls a random number",
        process: function(bot, message, args) {
            var roll = Math.floor(Math.random() * 10) + 1;
            bot.sendMessage(message.channel, "I rolled " + roll + ", gz or something");
        }
    },

    "queue": {
        usage: "[youtube-url]",
        description: "Add audio from a youtube link to the queue",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
          if (args.length === 0) {
            bot.sendMessage(message.channel, "You have to bring a link with the command");
          } else {
            playing = true;
            addToQueue(args[0], message);
          }
        }
    },

    "queuesize": {
        description: "List the play queue",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
          bot.reply(message, "There are " + queue.length + " songs in queue");
        }
    },

    "clearqueue": {
        description: "Clears the queue and stops the music",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
          clearQueue(message);
        }
    },

    "stop": {
        description: "Stops playing",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
          stopPlaying(message);
        }
    },

    "start": {
        description: "Starts with next song in the queue",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
          playing = true;
        }
    },

    "skip": {
        description: "Skip to the next song in queue",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
          playNextTrack();
        }
    },

    "join": {
        usage: "[channel_id]",
        description: "Selects in which channel the bot should live",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
          bot.joinVoiceChannel(args[0], function(error) {
      		    console.log(error.message);
      	  });
        }
    },

    "cat": {
      description: "I will give you my favorite cat image <3",
      process: function(bot, message, args) {
        bot.sendFile(message, "http://placekitten.com/" + (Math.floor((Math.random() * 900) + 100)+"/"+Math.floor((Math.random() * 900) + 100)), "cat.png", (err, msg) => {
          if(err)
            console.log("couldn't send image:", err);
          });
      }
    },

    "joinme": {
        description: "Join the channel of the user",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
            if(message.author.voiceChannel) {
                bot.joinVoiceChannel(message.author.voiceChannel, function(error) {
            		    console.log(error.message);
            	  });
            }
        }
    },

    "leave": {
        description: "Makes the bot leave the channel",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
            bot.leaveVoiceChannel(bot.voiceConnection.voiceChannel);
        }
    },
};

bot.on("ready", function() {
    console.log("Ready! Serving on " + bot.servers.length + " servers :)");
    bot.setPlayingGame("with your feelings");
    bot.servers.forEach(function(server) {
      if(server.channels.get("name", getBotChannelName(bot)) == null) {
        console.log("The channel '" + getBotChannelName(bot) + "' doesn't exist on server " + server.name);
      }
    });
    checkQueue();
});

bot.on("message", function(message){
    if (message.author.id != bot.user.id && message.content[0] === settings.botPrefix) {
        console.log("Treating " + message.content + " from " + message.author.username + " as a command.");
        let command = message.content.substring(1).split(" ");
        let cmd = commands[command[0]];

        if (command[0] === "help") {
            bot.sendMessage(message.channel, "Available Commands:", function(){
                for (var cmd in commands) {
                    var info = settings.botPrefix + cmd;
                    var usage = commands[cmd].usage;
                    if (usage) {
                        info += " " + usage;
                    }
                    var description = commands[cmd].description;
                    if (description) {
                        info += "\n\t" + description;
                    }
                    bot.sendMessage(message.channel, info);
                }
            });
        } else if(cmd) {
            try{
                if (cmd.channel == undefined || cmd.channel == message.channel.name ) {
                  command.shift();
                  cmd.process(bot, message, command);
                }
            } catch(e) {
                bot.sendMessage(message.channel, "And it was at that moment Daniel knew, he fucked up");
                console.log(e.stack);
            }
        }
    }
});

function getBotChannelName(client) {
    return (settings.musicChannel).toLowerCase();
}

function checkQueue() {
	if(playing && !queueEmpty() && !bot.voiceConnection.playing) {
		playNextTrack();
	}

	setTimeout(checkQueue, 5000);
}

function addToQueue(videoID, message) {
  queue.push(videoID);
  bot.reply(message, "Added song to queue! :)");
}

function playNextTrack() {
	if(queueEmpty()) {
		bot.voiceConnection.stopPlaying();
		return;
	}

  try{
    var options = {
      filter: (format) => format.container === 'mp4',
      quality: 'lowest',
    };
    let stream = ytdl(queue[0], options);
    //console.log(ytdl.getInfo(queue[0]));
    stream.on('error', function(error) {
      console.log(error);
    });

    bot.voiceConnection.playRawStream(stream, {volume: 0.2});
  } catch (exception) {
    console.log(exception);
  }

	queue.splice(0,1);
}

function stopPlaying(message) {
  bot.voiceConnection.stopPlaying();
  playing = false;
  bot.sendMessage(message, "Stopped playing audio");
}

function clearQueue(message) {
  queue = [];
  bot.reply(message, "The queue has been cleared!");
}

function queueEmpty() {
  return queue.length === 0;
}

bot.loginWithToken(settings.token).catch((error) => {
  console.log(error);
})

// Handle discord.js warnings
bot.on('warn', (m) => console.log('[warn]', m));
bot.on('debug', (m) => console.log('[debug]', m));

// Taget från https://github.com/meew0/Lethe/blob/master/lethe.js#L571
process.on('uncaughtException', function(err) {
  // Handle ECONNRESETs caused by `next` or `destroy`
  if (err.code == 'ECONNRESET') {
    // Yes, I'm aware this is really bad node code. However, the uncaught exception
    // that causes this error is buried deep inside either discord.js, ytdl or node
    // itself and after countless hours of trying to debug this issue I have simply
    // given up. The fact that this error only happens *sometimes* while attempting
    // to skip to the next video (at other times, I used to get an EPIPE, which was
    // clearly an error in discord.js and was now fixed) tells me that this problem
    // can actually be safely prevented using uncaughtException. Should this bother
    // you, you can always try to debug the error yourself and make a PR.
    console.log('Got an ECONNRESET! This is *probably* not an error. Stacktrace:');
    console.log(err.stack);
  } else {
    // Normal error handling
    console.log(err);
    console.log(err.stack);
    process.exit(0);
  }
});
