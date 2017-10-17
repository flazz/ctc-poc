var path = require('path'),
    express = require('express'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    config = require('../config'),
    token = require('../models/token');

var twilio = require('twilio');
var VoiceResponse = twilio.twiml.VoiceResponse;

// Create a Twilio REST API client for authenticated requests to Twilio
var twilio_client = twilio(config.accountSid, config.authToken);

// Create a Mongoose object to connect with MongoDB
var mongoose = require('mongoose');

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(config.mongodbURI, { useMongoClient: true }, function (err, res) {
    if (err) {
        console.log('ERROR connecting to: ' + config.mongodbURI + '. ' + err);
    } else {
        console.log('Succeeded connected to: ' + config.mongodbURI);
    }
});

// load the model schema
var AssignmentCallback = require('../models/AssignmentCallback');
var WorkspaceEvent = require('../models/WorkspaceEvent');

// Configure application routes
module.exports = function (app) {
    // Set Jade as the default template engine
    app.set('view engine', 'jade');

    // Express static file middleware - serves up JS, CSS, and images from the
    // "public" directory where we started our webapp process
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Parse incoming request bodies as form-encoded
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Use morgan for HTTP request logging
    app.use(morgan('combined'));


    /* CUSTOMER EXPERIENCE HANDLERS */

    // Home Page with Click to Call
    app.get('/', (request, response) => {
        response.render('index');
    });

    // Handle an AJAX POST request to place an outbound call
    app.post('/call', (request, response) => {

        // The contract for the POSTed document can be found in /public/app.js#75
        // I've refrained from repeating it here, although, it could be
        // necessary should we want to augment the tasks with something else.
        var taskAttributes = request.body;

        twilio_client.taskrouter.v1
            .workspaces(config.workspaceSid)
            .tasks
            .create({
                workflowSid: config.workflowSid,
                taskChannel: 'voice',
                attributes: JSON.stringify(taskAttributes)
            }).then((message) => {
                response.send({
                    message: `Thank you, we will contact you via ${config.twilioNumber}`
                });
            }).catch((error) => {
                console.error(error);
                response.status(500).send(error);
            });
    });


    /* AGENT EXPERIENCE HANDLERS */

    app.get('/agent', (request, response) => {
        let p = path.join(process.cwd(), 'public', 'agent.html');
        response.sendfile(p);
    });

    app.get('/client-token', (request, response) => {
        let tok = token.getClientToken(request.query.agentName)
        response.send(tok);
    });

    app.get('/worker-token', (request, response) => {
        let tok = token.getWorkerToken(
            request.query.agentName,
            config.accountSid,
            config.authToken,
            config.workspaceSid,
            config.workerSid
        );
        response.send(tok);
    });


    /* TASK ROUTING HANDLERS */

    // For a full list of what will be posted, please refer to the following
    // url:
    // https://www.twilio.com/docs/api/taskrouter/handling-assignment-callbacks
    // This must respond within 5 seconds or it will move the Fallback URL.
    app.post('/assignment_callbacks', twilio.webhook({ validate: config.shouldValidate }), (request, response) => {
        console.log("ASSIGNMENT CALLBACK", request.query, request.body);

        let workspaceSid = request.body.WorkspaceSid,
            taskSid = request.body.TaskSid,
            callbackResponse = {
                accept: true,
                from: config.twilioNumber,
                instruction: "call",
                record: "record-from-answer",
                timeout: 10,
                url: `https://${request.headers.host}/callbacks/ctc-agent-answers?WorkspaceSid=${workspaceSid}&TaskSid=${taskSid}`,
                status_callback_url: `https://${request.headers.host}/callbacks/ctc-agent-complete?WorkspaceSid=${workspaceSid}&TaskSid=${taskSid}`
            };

        response.status(200).send(callbackResponse);
    });

    // This must come before /callbacks/:uuid to be matched explictly.
    app.post('/callbacks/ctc-agent-answers', twilio.webhook({ validate: config.shouldValidate }), (request, response) => {
        console.log("CTC AGENT ANSWERS", request.query, request.body);

        let workspaceSid = request.query.WorkspaceSid,
            taskSid = request.query.TaskSid;

        twilio_client.taskrouter.v1
            .workspaces(workspaceSid)
            .tasks(taskSid)
            .fetch()
            .then((task) => {
                let taskAttributes = JSON.parse(task.attributes);
                let twimlResponse = new VoiceResponse();
                twimlResponse.say('Click-To-Call requested. Please hold for customer connection.', { voice: 'man' });
                twimlResponse.say('Hi agent, This call may be monitored or recorded for quality and training purposes.');

                let dial = twimlResponse.dial({
                    callerId: config.twilioNumber,
                    record: "record-from-answer-dual"
                });

                dial.number({
                    url: `https://${request.headers.host}/callbacks/ctc-customer-pre-connect`,
                }, taskAttributes.phoneNumber);
                response.send(twimlResponse.toString());
            }, (error) => {
                console.log("ERROR", error)
                response.status(500).send(error);
            });
    });

    app.post('/callbacks/ctc-agent-complete', twilio.webhook({ validate: config.shouldValidate }), (request, response) => {
        let workspaceSid = request.query.WorkspaceSid,
            taskSid = request.query.TaskSid;

        console.log('CTC AGENT COMPLETE');

        // complete the task
        twilio_client.taskrouter.v1
            .workspaces(workspaceSid)
            .tasks(taskSid)
            .update({ assignmentStatus: 'completed', reason: 'call clear' })
            .then((task) => {
                console.log("TASK COMPLETE", task.assignmentStatus, task.reason);
                response.status(200).send('OK');
            }, (error) => {
                console.log("ERROR", error)
                response.status(500).send(error);
            });
    });

    app.post('/callbacks/ctc-customer-pre-connect', twilio.webhook({ validate: config.shouldValidate }), (request, response) => {
        console.log('CTC CUSTOMER PRE-CONNECT');
        let twimlResponse = new VoiceResponse();
        twimlResponse.say('Hi customer, This call may be monitored or recorded for quality and training purposes.');
        response.send(twimlResponse.toString());
    });


    /* EVENT HANDLERS */

    // Twilio Voice Call Status Change Webhook
    app.post('/events/voice', (request, response) => {
        response.status(200).send('OK');
    });

    // For a full list of what will be posted, please refer to the following
    // url: https://www.twilio.com/docs/api/taskrouter/events#event-callbacks
    app.post('/events/workspaces', twilio.webhook({ validate: config.shouldValidate }), (request, response) => {
        console.log("WORKSPACE EVENT", request.body.EventType, request.body.EventDescription)
        /* TODO getting error on WorkspaceEvent not being a constructor, silencing for now
        var attributes = request.body;
        var workspaceEvent = new WorkspaceEvent(attributes);
        workspaceEvent.save(function (err) {
            if (!err) {
                response.status(200).send('OK');
            } else {
                console.error(err);
                response.status(500).send(err);
            };
        });
        */
    });

};
