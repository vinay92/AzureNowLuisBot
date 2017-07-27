/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var request = require('request');
var querystring = require('querystring');

var useEmulator = (process.env.NODE_ENV == 'development');
var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })

.matches('AnalyzeDataQuestion', (session, args) => {
    session.send('Ok, Let\'s get started. How much data do you have?');
})

.matches('DataSize', (session, args) => {
    session.send('Alright. Do you have structured or unstructured data?');
})

.matches('Unstructured', (session, args) => {
    session.send('Is your data already present in the cloud or in on-premise servers?');
})

.matches('None', (session, args) => {
    session.send('Is your data already present in the cloud or in on-premise servers?');
})

.matches('Cloud', (session, args) => {
    session.send('That\'s perfect. Do you need access control on your data');
})

.matches('AccessControl', (session, args) => {
    session.send('Finally, what is the price you are expecting to spend on this solution?');
})

.matches('Price', (session, args) => {
    var price = 2500;
    var entities = args['entities'];
    for (var i = 0; i < entities.length; i++) {
        var entityObject = entities[i];
        if (entityObject['type'] == "Amount") {
            price = parseInt(entityObject['entity'], 10);
            break;
        }
    }

    session.send('I have all the information I need. Generating the ARM template and the price...');
    var data = {
                    "Services" : [
                        "HDInsight",
                        "Data Lake"
                    ],
                    "Price" : price,
                    "SessionId" : "04eb7df7-82bf-477c-a350-1a77e3abca67"
                };
    request({
            headers: {
                        'Content-Type' : 'application/json'
                    },
            url: 'http://templatehackbot.azurewebsites.net/api/templates',
            json: data,
            method: 'POST'
            }, function (err, res, body) {
                var templateString = 'The template link is - ' +  body['TemplateLink'];
                var serviceArchitecture = body['ServiceArchitecture'];
                var resourceObjects = serviceArchitecture['Resources'];
                var resourcePriceString = '';
                for (var i = 0; i < resourceObjects.length; i++) 
                {
                    var tempResourceObject = resourceObjects[i]
                    resourcePriceString += tempResourceObject['<Name>k__BackingField'] + " - Price - " + tempResourceObject['<Price>k__BackingField'] + "$<br />";

                }
                session.send("The template can be downloaded at - " + templateString);
                session.send("The suggested services and price per service are " + "<br />" + resourcePriceString);
    });
})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);    

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}

