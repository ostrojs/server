// worker-wrapper.js
const path = require('path');

async function main() {
    const [modulePath, handlerName] = process.argv.slice(2);
    const { event } = JSON.parse(await new Promise((resolve) => {
        let data = '';
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => resolve(data));
    }));

    try {
        const handlerModule = require(modulePath);
        const handler = typeof handlerModule === 'function' ? handlerModule : handlerModule[handlerName];

        if (typeof handler !== 'function') {
            throw new Error(`Handler "${handlerName}" is not a function`);
        }

        const result = await Promise.resolve(handler(event));

        // Print logs (everything except the result JSON part)
        // (if your handler logs to console.log, it will appear on stdout anyway)

        // Print the result wrapped in markers for the parent process to parse
        process.stdout.write(`\n<<<__LAMBDA_RESULT__>>>\n${JSON.stringify(result)}\n<<<__END__>>>\n`);
        process.exit(0);
    } catch (err) {
        // Write error message to stderr
        process.stderr.write(err.stack || err.toString());
        process.exit(1);
    }
}

main();
