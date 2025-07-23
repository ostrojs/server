const LambdaWorker = require('./lambdaWorker');
const EventBuilder = require('./eventBuilder');
const ResponseSender = require('./responseSender');
const path = require('path');

class LambdaSimulator {
    constructor(handlerString, serverlessConfig) {
        if (!path.isAbsolute(handlerString)) {
            handlerString = path.resolve(process.cwd(), handlerString);
        }
        const lastDot = handlerString.lastIndexOf('.');
        if (lastDot === -1) throw new Error('Handler must be in format <path>.<function>');

        const modulePath = handlerString.substring(0, lastDot);

        if (!path.isAbsolute(modulePath)) {
            throw new Error('Module path must be absolute');
        }
        Object.defineProperties(this, {
            $strategy: {
                value: 'process',
                writable: true
            },
            $modulePath: {
                value: modulePath,
                writable: false
            },
            $handlerName: {
                value: handlerString.substring(lastDot + 1),
                writable: false
            },
            $serverless: {
                value: serverlessConfig || {},
            }
        });
    }

    async handleHttpRequest(req, res) {
        const event = await EventBuilder.fromHttpRequest(req);
        try {
            const worker = LambdaWorker.create(this.$serverless.strategy); // or 'vm', 'process', 'fork'
            const result = await worker.run(this.$modulePath, this.$handlerName, event);
            ResponseSender.sendSuccess(res, result);
        } catch (err) {
            ResponseSender.sendError(res, err);
        }
    }

    async handleEvent(event) {
        return await LambdaWorker.run(this.$modulePath, this.$handlerName, event);
    }
}

module.exports = LambdaSimulator;
