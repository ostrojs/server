import { LambdaSimulator } from '../serverless/lambdaSimulator';

class ServerLess {
    public $lambda!: LambdaSimulator;

    /**
     * constructor method.
     *
     * @param serverlessConfig - Serverless configuration object
     */
    constructor(serverlessConfig: any) {
        Object.defineProperties(this, {
            $lambda: {
                value: new LambdaSimulator(serverlessConfig)
            }
        });
    }

    /**
     * handle method.
     *
     * @param $request - Request constructor class
     * @param $response - Response constructor class
     * @returns Request handler function
     */
    public handle($request: any, $response: any): (req: any, res: any) => Promise<void> {
        return (req: any, res: any): Promise<void> => {
            req = new $request(req);
            res = new $response(res);
            return this.$lambda.handleHttpRequest(req, res);
        };
    }
}

export default ServerLess;