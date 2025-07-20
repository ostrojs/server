#!/usr/bin/env node

const { argv } = require('process');
const path = require('path');

if (require.main === module) {
    (async () => {
        const [, , modulePath, handlerName] = argv;
        let input = '';

        for await (const chunk of process.stdin) input += chunk;

        try {
            const { event } = JSON.parse(input);

            process.chdir(path.dirname(modulePath));
            const mod = require(modulePath);
            const fn = mod[handlerName];
            if (typeof fn !== 'function') throw new Error(`Handler "${handlerName}" not found`);

            const result = await fn(event, {});

            let finalResult = { ...result };

            if (typeof finalResult.body === 'string') {
                try {
                    JSON.parse(finalResult.body); // valid JSON string, leave as-is
                } catch {
                    finalResult.body = String(finalResult.body);
                }
            }

            process.stdout.write('\n<<<__LAMBDA_RESULT__>>>\n');
            process.stdout.write(JSON.stringify(finalResult));
            process.stdout.write('\n<<<__END__>>>\n');
        } catch (err) {
            console.error(err.stack || err.message);
            process.exit(1);
        }
    })();
}
