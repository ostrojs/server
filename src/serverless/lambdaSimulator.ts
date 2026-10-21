import { resolve as pathResolve, isAbsolute as pathIsAbsolute } from 'path';
import { LambdaWorker } from './lambdaWorker';
import { EventBuilder } from './eventBuilder';
import { ResponseSender } from './responseSender';

interface ServerlessConfig {
    handler: string;
    strategy?: string;
    [key: string]: unknown;
}

class LambdaSimulator {
    public $strategy!: string;
    public readonly $modulePath!: string;
    public readonly $handlerName!: string;
    public readonly $serverless!: ServerlessConfig;

    /**
     * constructor method.
     *
     * @param serverlessConfig - Serverless configuration object
     */
    constructor(serverlessConfig: ServerlessConfig) {
        let handlerString: string = serverlessConfig.handler;
        if (!pathIsAbsolute(handlerString)) {
            handlerString = pathResolve(process.cwd(), handlerString);
        }
        const lastDot: number = handlerString.lastIndexOf('.');
        if (lastDot === -1) throw new Error('Handler must be in format <path>.<function>');

        const modulePath: string = handlerString.substring(0, lastDot);
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
                value: serverlessConfig,
            }
        });
    }

    /**
     * handleHttpRequest method.
     *
     * @param req - HTTP request object
     * @param res - HTTP response object
     */
    public async handleHttpRequest(req: any, res: any): Promise<void> {
        const event: unknown = await EventBuilder.fromHttpRequest(req);
        try {
            const worker = LambdaWorker.create(this.$serverless.strategy); // or 'vm', 'process', 'fork'
            const result = await worker.run(this.$modulePath, this.$handlerName, event);
            ResponseSender.sendSuccess(res, result as any);
        } catch (err: unknown) {
            ResponseSender.sendError(res, err);
        }
    }

    /**
     * handleEvent method.
     *
     * @param event - Event data
     * @returns Handler execution result
     */
    public async handleEvent(event: unknown): Promise<unknown> {
        const worker = LambdaWorker.create(this.$serverless.strategy);
        return await worker.run(this.$modulePath, this.$handlerName, event);
    }
}

export { LambdaSimulator };
export default LambdaSimulator;
