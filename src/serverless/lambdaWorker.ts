import { dirname as pathDirname } from 'node:path';
import { VmStrategy } from './strategies/vmStrategy';
import { ThreadStrategy } from './strategies/threadStrategy';
import { ProcessStrategy } from './strategies/processStrategy';
import { ForkStrategy } from './strategies/forkStrategy';

interface WorkerStrategy {
    run(modulePath: string, handlerName: string, event: unknown, cwd?: string): Promise<unknown>;
}

interface WorkerRunOptions {
    cwd?: string;
    [key: string]: unknown;
}

class LambdaWorker {
    public strategy: WorkerStrategy;

    /**
     * constructor method.
     *
     * @param strategy - Worker strategy instance
     */
    constructor(strategy: WorkerStrategy) {
        this.strategy = strategy;
    }

    /**
     * run method.
     *
     * @param modulePath - Handler module path
     * @param handlerName - Handler function name
     * @param event - Event payload
     * @param options - Execution options
     * @returns Result of strategy run
     */
    public run(modulePath: string, handlerName: string, event: unknown, options: WorkerRunOptions = {}): Promise<unknown> {
        const cwd: string = options.cwd || pathDirname(modulePath);
        return this.strategy.run(modulePath, handlerName, event, cwd);
    }

    /**
     * create method.
     *
     * @param strategyName - Strategy name ('vm', 'thread', 'fork', 'process')
     * @returns LambdaWorker instance
     */
    static create(strategyName?: string): LambdaWorker {
        switch (strategyName) {
            case 'vm': return new LambdaWorker(new VmStrategy());
            case 'thread': return new LambdaWorker(new ThreadStrategy());
            case 'fork': return new LambdaWorker(new ForkStrategy());
            case 'process':
            default: return new LambdaWorker(new ProcessStrategy());
        }
    }
}

export { LambdaWorker };
export default LambdaWorker;
