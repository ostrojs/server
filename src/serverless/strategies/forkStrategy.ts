import { fork, ChildProcess } from 'child_process';
import { resolve as pathResolve } from 'path';

class ForkStrategy {
    /**
     * run method.
     *
     * @param modulePath - Handler module path
     * @param handlerName - Handler function name
     * @param event - Event payload
     * @param cwd - Working directory
     * @returns Promise resolving to result
     */
    public async run(modulePath: string, handlerName: string, event: unknown, cwd?: string): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const forkWrapper: string = pathResolve(__dirname, '../wrappers/frokWrapper.js');
            const child: ChildProcess = fork(forkWrapper, [modulePath, handlerName], { cwd, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });

            let settled: boolean = false;
            child.on('message', (msg: any) => {
                settled = true;
                if (msg.error) {
                    reject(new Error(msg.error));
                } else {
                    resolve(msg.result);
                }
            });

            child.on('error', (err: Error) => {
                settled = true;
                reject(err);
            });
            child.on('exit', (code: number | null) => {
                if (!settled && code !== 0) {
                    reject(new Error(`Forked process exited with code ${code}`));
                }
            });

            child.send({ event });
        });
    }
}

export { ForkStrategy };
export default ForkStrategy;
