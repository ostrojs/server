import { Worker } from 'worker_threads';
import { resolve as pathResolve } from 'path';

class ThreadStrategy {
    /**
     * run method.
     *
     * @param modulePath - Handler module path
     * @param handlerName - Handler function name
     * @param event - Event payload
     * @param cwd - Working directory (optional)
     * @returns Promise resolving to worker message
     */
    public async run(modulePath: string, handlerName: string, event: unknown, cwd?: string): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const workerPath: string = pathResolve(__dirname, '../wrappers/threadWrapper.js');
            const worker: Worker = new Worker(workerPath, {
                workerData: { modulePath, handlerName, event }
            });
            worker.on('message', (msg: any) => {
                if (msg && msg.error) {
                    reject(new Error(msg.error));
                } else {
                    resolve(msg);
                }
            });
            worker.on('error', reject);
            worker.on('exit', (code: number) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    }
}

export { ThreadStrategy };
export default ThreadStrategy;
