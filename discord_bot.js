var Discord = require('discord.js');
var settings = require('./settings.json');
var youtubeStream = require('youtube-audio-stream')

var bot = new Discord.Client();

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
        description: "Add audio from a youtube link to the queue",
        process: function(bot, message, args) {
          if (!args) {
            bot.sendMessage(message.channel, "You have to bring a link with the command");
          } else {
            playing = true;
            addToQueue(args[0], message);
          }
        }
    },

    "queuesize": {
        description: "List the play queue",
        process: function(bot, message, args) {
          bot.reply(message, "There are " + queue.length + " songs in queue");
        }
    },

    "clearqueue": {
        description: "Clears the queue and stops the music",
        process: function(bot, message, args) {
          clearQueue(message);
        }
    },

    "stop": {
        description: "Stops playing",
        process: function(bot, message, args) {
          stopPlaying(message);
        }
    },

    "start": {
        description: "Starts with next song in the queue",
        process: function(bot, message, args) {
          playing = true;
        }
    },

    "skip": {
        description: "Skip to the next song in queue",
        process: function(bot, message, args) {
          playNextTrack();
        }
    },

    "join": {
        description: "Selects in which channel the bot should live",
        process: function(bot, message, args) {
          bot.joinVoiceChannel(args[0], function(error) {
      		    console.log(error.message);
      	  });
        }
    },
};

bot.on("ready", function() {
    console.log("Ready! Serving in " + bot.channels.length + " channels :)");
    let channel = bot.channels.get("id", 139438913591836672);
    //let channel = bot.channels.get("id", 98833571774468096);
    bot.joinVoiceChannel(channel, function(error) {
		    console.log(error.message);
	  });
    checkQueue();
});

bot.on("message", function(message){
    if (message.author.id != bot.user.id && message.content[0] === '!') {
        console.log("Treating " + message.content + " from " + message.author.username + " as a command.");
        let command = message.content.substring(1).split(" ");
        let cmd = commands[command[0]];

        if (command[0] === "help") {
            bot.sendMessage(message.channel, "Available Commands:", function(){
                for (var cmd in commands) {
                    var info = "!" + cmd;
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
                command.shift();
                cmd.process(bot, message, command);
            } catch(e) {
                bot.sendMessage(message.channel, "And it was at that moment Daniel knew, he fucked up");
                console.log(e.stack);
            }
        }
    }
});

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
    let stream = youtubeStream(queue[0]);
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

bot.login(settings.email, settings.password);
