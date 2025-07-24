const { spawn } = require('child_process');
const path = require('path');

class ProcessStrategy {
    async run(modulePath, handlerName, event, cwd) {
        return new Promise((resolve, reject) => {
            const wrapper = path.resolve(__dirname, '../wrappers/workerWrapper.js');
            const child = spawn(
                process.execPath,
                [wrapper, modulePath, handlerName],
                { stdio: ['pipe', 'pipe', 'pipe'], cwd }
            );

            const stdoutChunks = [];
            const stderrChunks = [];

            child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
            child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

            child.on('close', (code) => {
                const stdout = Buffer.concat(stdoutChunks).toString();
                const stderr = Buffer.concat(stderrChunks).toString();

                if (code !== 0) {
                    return reject(new Error(stderr || `Exit code ${code}`));
                }

                const logs = stdout.split('\n<<<__LAMBDA_RESULT__>>>')[0];;
                if (logs) {
                    console.log(logs);
                }

                const resultMatch = stdout.match(/\n<<<__LAMBDA_RESULT__>>>\n([\s\S]*?)\n<<<__END__>>>\n?/);
                if (!resultMatch) {
                    return reject(new Error('No valid Lambda result found in output:\n' + stdout));
                }

                try {
                    const result = JSON.parse(resultMatch[1]);
                    resolve(result);
                } catch (err) {
                    reject(new Error('Failed to parse Lambda result JSON: ' + err.message));
                }
            });

            child.stdin.write(JSON.stringify({ event }));
            child.stdin.end();
        });
    }
}

module.exports = ProcessStrategy;
