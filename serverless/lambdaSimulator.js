const LambdaWorker = require('./lambdaWorker');
const EventBuilder = require('./eventBuilder');
const ResponseSender = require('./responseSender');
const path = require('path');

class LambdaSimulator {
    constructor(handlerString) {
        if (!path.isAbsolute(handlerString)) {
            handlerString = path.resolve(process.cwd(), handlerString);
        }
        const lastDot = handlerString.lastIndexOf('.');
        if (lastDot === -1) throw new Error('Handler must be in format <path>.<function>');

        this.modulePath = handlerString.substring(0, lastDot);
        this.handlerName = handlerString.substring(lastDot + 1);

        if (!path.isAbsolute(this.modulePath)) {
            throw new Error('Module path must be absolute');
        }
    }

    async handleHttpRequest(req, res) {
        const event = await EventBuilder.fromHttpRequest(req);
        try {
            const result = await LambdaWorker.run(this.modulePath, this.handlerName, event);
            ResponseSender.sendSuccess(res, result);
        } catch (err) {
            ResponseSender.sendError(res, err);
        }
    }

    async handleEvent(event) {
        return await LambdaWorker.run(this.modulePath, this.handlerName, event);
    }
}

module.exports = LambdaSimulator;
