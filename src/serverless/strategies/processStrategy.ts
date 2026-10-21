import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { resolve as pathResolve } from 'path';

class ProcessStrategy {
    /**
     * run method.
     *
     * @param modulePath - Handler module path
     * @param handlerName - Handler function name
     * @param event - Event payload
     * @param cwd - Working directory
     * @returns Promise resolving to parsed result
     */
    public async run(modulePath: string, handlerName: string, event: unknown, cwd?: string): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const wrapper: string = pathResolve(__dirname, '../wrappers/workerWrapper.js');
            const child: ChildProcessWithoutNullStreams = spawn(
                process.execPath,
                [wrapper, modulePath, handlerName],
                { stdio: ['pipe', 'pipe', 'pipe'], cwd }
            );

            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];

            child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
            child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

            child.on('close', (code: number | null) => {
                const stdout: string = Buffer.concat(stdoutChunks).toString();
                const stderr: string = Buffer.concat(stderrChunks).toString();

                if (code !== 0) {
                    return reject(new Error(stderr || `Exit code ${code}`));
                }

                const logs: string = stdout.split('\n<<<__LAMBDA_RESULT__>>>')[0];
                if (logs) {
                    console.log(logs);
                }

                const resultMatch: RegExpMatchArray | null = stdout.match(/\n<<<__LAMBDA_RESULT__>>>\n([\s\S]*?)\n<<<__END__>>>\n?/);
                if (!resultMatch) {
                    return reject(new Error('No valid Lambda result found in output:\n' + stdout));
                }

                try {
                    const result: unknown = JSON.parse(resultMatch[1]);
                    resolve(result);
                } catch (err: any) {
                    reject(new Error('Failed to parse Lambda result JSON: ' + (err as Error).message));
                }
            });

            child.stdin.write(JSON.stringify({ event }));
            child.stdin.end();
        });
    }
}

export { ProcessStrategy };
export default ProcessStrategy;
