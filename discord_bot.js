var Discord = require('discord.js');
var settings = require('./settings.json');
var ytdl = require('ytdl-core');
var storage = require('./lib/storage.js');
var http = require('http');

var bot = new Discord.Client({
    autoReconnect: true
});
var store = new storage();

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
            let winner = randomUser(message.channel.server);
            bot.sendMessage(message.channel, winner + " is the lucky winner!");
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
        usage: "[youtube-url] or [random]",
        description: "Add audio from a youtube link to the queue",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
            if (args.length === 0) {
                bot.sendMessage(message.channel, "You have to bring a link with the command");
            } else {
                playing = true;
                if (args[0] === "random") {
                    store.getRandomUrl((url) => {
                        addToQueue(url, message);
                    });
                } else {
                    addToQueue(args[0], message);
                    store.storeTrackUrl(args[0]);
                }
            }
        }
    },

    "listqueue": {
        description: "List all the songs in queue",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
            listQueue(message.channel);
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
            bot.sendFile(message, "http://placekitten.com/" + (Math.floor((Math.random() * 900) + 100) + "/" + Math.floor((Math.random() * 900) + 100)), "cat.png", (err, msg) => {
                if (err)
                    console.log("couldn't send image:", err);
            });
        }
    },

    "joinme": {
        description: "Join the channel of the user",
        channel: getBotChannelName(),
        process: function(bot, message, args) {
            if (message.author.voiceChannel) {
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

    "power": {
        description: "BRAINPOWER!",
        process: function(bot, message, args) {
            bot.sendMessage(message.channel, "O-oooooooooo AAAAE-A-A-I-A-U- JO-oooooooooooo AAE-O-A-A-U-U-A- E-eee-ee-eee AAAAE-A-E-I-E-A-JO-ooo-oo-oo-oo EEEEO-A-AAA-AAAA");
        }
    },

    "toplist": {
        description: "Prints usage toplist",
        process: function(bot, message, args) {
            store.getCommandLog((string) => {
                bot.sendMessage(message.channel, string);
            });
        }
    },

    "joke": {
        description: "I will tell a funny joke about a random user",
        process: function(bot, message, args) {
            let winner = randomUser(message.channel.server);
            let options = {
                host: 'api.icndb.com',
                path: `/jokes/random?firstName=${winner.username}&lastName=`
            };

            http.request(options, (response) => {
                let str = '';
                response.on('data', (chunk) => {
                    str += chunk;
                });
                response.on('end', () => {
                    let joke = JSON.parse(str).value.joke;
                    bot.sendMessage(message.channel, joke.replace(/&quot;/g, '"'));
                });
            }).end();
        }
    },
};

bot.on("ready", function() {
    console.log("Ready! Serving on " + bot.servers.length + " servers :)");
    bot.setPlayingGame("with your feelings");
    bot.servers.forEach(function(server) {
        if (server.channels.get("name", getBotChannelName(bot)) == null) {
            console.log("The channel '" + getBotChannelName(bot) + "' doesn't exist on server " + server.name);
        }
    });
    checkQueue();
});

bot.on("message", function(message) {
    if (message.author.id != bot.user.id && message.content[0] === settings.botPrefix) {
        console.log("Treating " + message.content + " from " + message.author.username + " as a command.");
        let command = message.content.substring(1).split(" ");
        let cmd = commands[command[0]];

        if (command[0] === "help") {
            printCommands(message.channel);
        } else if (cmd) {
            try {
                if (cmd.channel == undefined || cmd.channel == message.channel.name) {
                    command.shift();
                    cmd.process(bot, message, command);
                    store.logCommand(message.author);
                }
            } catch (e) {
                bot.sendMessage(message.channel, "And it was at that moment Daniel knew, he fucked up");
                console.log(e.stack);
            }
        }
    }
});

function printCommands(channel) {
    let msg = "Available Commands: \n ```";
    for (let cmd in commands) {
        msg += settings.botPrefix + cmd;
        let usage = commands[cmd].usage;
        if (usage) {
            msg += ` ${usage}`;
        }
        let restricted = commands[cmd].channel;
        if (restricted) {
            msg += ` (in #${restricted})`;
        }
        let description = commands[cmd].description;
        if (description) {
            msg += `\n\t${description}`;
        }
        msg += "\n\n";
    }
    msg += "```";
    bot.sendMessage(channel, msg);
}

function getBotChannelName(client) {
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
            bot.reply(message, "There was a problem adding the video.");
        } else {
            let track = {
                title: info.title,
                author: info.author,
                view_count: info.view_count,
                length_seconds: info.length_seconds,
                info: info
            };
            queue.push(track);
            bot.reply(message, "Added song to queue! :)");
        }
    });
}

function listQueue(channel) {
    let message = "Songqueue: \n ```";
    for (let index in queue) {
        let track = queue[index];
        message += `${index}. ${track.title} by ${track.author}, [${track.view_count}] views, ${track.length_seconds} seconds\n\n`;
    };
    message += "```";
    bot.sendMessage(channel, message);
}

function playNextTrack() {
    if (queueEmpty()) {
        bot.voiceConnection.stopPlaying();
        return;
    }

    try {
        var options = {
            filter: (format) => format.container === 'mp4',
            quality: 'lowest',
        };
        let stream = ytdl.downloadFromInfo(queue[0].info, options);
        stream.on('error', function(error) {
            console.log(error);
        });

        bot.voiceConnection.playRawStream(stream, {
            volume: 0.2
        });
    } catch (exception) {
        console.log(exception);
    }

    queue.splice(0, 1);
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

function randomUser(server) {
    let users = server.members.getAll("status", "online");
    let winner = Math.floor(Math.random() * users.length);
    return users[winner];
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
