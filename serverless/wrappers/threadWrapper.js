// worker-wrapper-thread.js
const { parentPort, workerData } = require('worker_threads');

async function main() {
    try {
        const { modulePath, handlerName, event } = workerData;
        const handlerModule = require(modulePath);
        const handler = typeof handlerModule === 'function' ? handlerModule : handlerModule[handlerName];

        if (typeof handler !== 'function') {
            throw new Error(`Handler "${handlerName}" is not a function`);
        }

        const result = await Promise.resolve(handler(event));
        parentPort.postMessage(result);
    } catch (err) {
        parentPort.postMessage({ error: err.stack || err.toString() });
    }
}

main();
