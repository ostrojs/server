// worker-wrapper-fork.js
const path = require('path');

process.on('message', async (msg) => {
    const [modulePath, handlerName] = process.argv.slice(2);
    const event = msg.event;

    try {
        const handlerModule = require(modulePath);
        const handler = typeof handlerModule === 'function' ? handlerModule : handlerModule[handlerName];

        if (typeof handler !== 'function') {
            throw new Error(`Handler "${handlerName}" is not a function`);
        }

        const result = await Promise.resolve(handler(event));
        process.send({ result });
    } catch (error) {
        process.send({ error: error.stack || error.toString() });
    }
});
