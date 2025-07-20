const LambdaSimulator = require('../serverless/lambdaSimulator');
class ServerLess {
    constructor(handler) {
        this.handler = handler
    }

    handle($request, $response) {
        const lambda = new LambdaSimulator(this.handler);
        return async (req, res) => {
            req = new $request(req);
            res = new $response(res);
            lambda.handleHttpRequest(req, res)
        }
    }
}
module.exports = ServerLess;