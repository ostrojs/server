const LambdaSimulator = require('../serverless/lambdaSimulator');
class ServerLess {
    constructor(serverlessConfig) {
        Object.defineProperties(this, {
            $lambda: {
                value: new LambdaSimulator(serverlessConfig)
            }
        })

    }

    handle($request, $response) {
        return (req, res) => {
            req = new $request(req);
            res = new $response(res);
            return this.$lambda.handleHttpRequest(req, res)
        }
    }
}
module.exports = ServerLess;
