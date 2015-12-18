var Discord = require('discord.js');
var settings = require('./settings.json');

var bot = new Discord.Client();

var commands = {
    "ping": {
        description: "Responds pong",
        process: function(bot, message, suffix) {
            bot.sendMessage(message.channel, message.sender + " pong!");
        }
    },

    "winner": {
        usage: "[username]",
        description: "Chooses a lucky winner between online members of the server",
        process: function(bot, message, suffix) {
            var users = message.channel.server.members.getAll("status", "online");
            var winner = Math.floor(Math.random() * users.length);
            bot.sendMessage(message.channel, users[winner] + " is the lucky winner!");
        }
    },

    "roll": {
        description: "Rolls a random number",
        process: function(bot, message, suffix) {
            var roll = Math.floor(Math.random() * 10) + 1;
            bot.sendMessage(message.channel, "I rolled " + roll + ", gz or something");
        }
    }
};

bot.on("ready", function() {
    console.log("Ready! Serving in " + bot.channels.length + " channels :)");
});

bot.on("message", function(message){
    if (message.author.id != bot.user.id && message.content[0] === '!') {
        console.log("Treating " + message.content + " from " + message.author.username + " as a command.");
        var command = message.content.substring(1);
        var suffix = "";
        var cmd = commands[command];

        if (command === "help") {
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
                cmd.process(bot, message, suffix);
            } catch(e) {
                bot.sendMessage(message.channel, "And it was at that moment Daniel knew, he fucked up");
                console.log(e.stack);
            }
        }
    }
});

bot.login(settings.email, settings.password);
