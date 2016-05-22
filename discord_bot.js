var Discord = require('discord.js');
var settings = require('./settings.json');
var fs = require('fs');
var request = require('request');

var bot = new Discord.Client();

let queue = [];
let playing = false;
let nowPlaying = "";

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
            addToQueue(getVideoId(args[0]), message);
          }
        }
    },

    "listqueue": {
        description: "List the play queue",
        process: function(bot, message, args) {
          getSongQueue(message);
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

    "playing": {
        description: "Prints whats playing",
        process: function(bot, message, args) {
          bot.sendMessage(message.channel, nowPlaying);
        }
    },

    "skip": {
        description: "Skip to the next song in queue",
        process: function(bot, message, args) {
          playNextTrack();
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

function addToQueue(videoID, message) {
  var baseURL = "https://savedeo.com/download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D";

  request(baseURL + videoID, function (error, response, body) {

		if (!error && response.statusCode == 200) {
			let cheerio = require('cheerio'), $ = cheerio.load(body);
      let title = $('title').text();

      //if(title.indexOf('SaveDeo') != -1) {
				//bot.reply(message, "Sorry, I couldn't get audio track for that video.");
				//return;
			//}

			let audioURL = $('#main div.clip table tbody tr th span.fa-music').first().parent().parent().find('td a').attr('href');

			queue.push({
        title: title,
        url: audioURL,
      });

      bot.reply(message, "I added " + title + " to the queue! :)");
    } else {
      bot.reply(message, "And it was at that moment Daniel knew, he fucked up. In addToQueue");
      console.log(error);
    }
  });
}

function playNextTrack() {
	if(queueEmpty()) {
		bot.voiceConnection.stopPlaying();
		return;
	}

	bot.voiceConnection.playFile(queue[0]['url'], {volume: 0.2});

	nowPlaying = queue[0]['title'];
	//nowPlayingUser = queue[0]['user'];

	//console.log(getTime() +  "NP: \"" + nowPlayingTitle + "\" (by " + nowPlayingUser + ")");

	//if(playing) {
		//bot.sendMessage(bot.servers.get('name', serverName).channels.get('name', textChannelName), "Now Playing: \"" + nowPlayingTitle + "\" (requested by " + queue[0]['mention'] + ")");
	//}

	queue.splice(0,1);
}

function stopPlaying(message) {
  bot.voiceConnection.stopPlaying();
  playing = false;
  nowPlaying = "None";
  bot.sendMessage(message, "Stopped playing audio");
}

function checkQueue() {
	if(playing && !queueEmpty() && !bot.voiceConnection.playing) {
		playNextTrack();
	}

	setTimeout(checkQueue, 5000);
}

function clearQueue(message) {
  queue = [];
  bot.reply(message, "The queue has been cleared!");
}

function queueEmpty() {
  return queue.length === 0;
}

function getVideoId(string) {
	var searchToken = "?v=";
	var i = string.indexOf(searchToken);

	if(i == -1) {
		searchToken = "&v=";
		i = string.indexOf(searchToken);
	}

	if(i == -1) {
		searchToken = "youtu.be/";
		i = string.indexOf(searchToken);
	}

	if(i != -1) {
		var substr = string.substring(i + searchToken.length);
		var j = substr.indexOf("&");

		if(j == -1) {
			j = substr.indexOf("?");
		}

		if(j == -1) {
			return substr;
		} else {
			return substr.substring(0,j);
		}
	}

	return string;
}

function getSongQueue(message) {

	var response = "";

	if(queueEmpty()) {
		response = "the queue is empty.";
	} else {
		for(var i = 0; i < queue.length; i++) {
			response += "\"" + queue[i]['title'] + "\ \n";
		}
	}

	bot.reply(message, response);
}

bot.login(settings.email, settings.password);
