const url = require('url');

class EventBuilder {
    static fromHttpRequest(req) {
        return new Promise((resolve) => {
            const bodyChunks = [];
            req.on('data', chunk => bodyChunks.push(chunk));
            req.on('end', () => {
                const body = Buffer.concat(bodyChunks).toString();
                const parsedUrl = url.parse(req.url, true);
                resolve({
                    version: '2.0',
                    routeKey: parsedUrl.pathname,
                    rawPath: parsedUrl.pathname,
                    rawQueryString: parsedUrl.search ? parsedUrl.search.slice(1) : '',
                    headers: req.headers,
                    requestContext: {
                        http: {
                            method: req.method,
                            path: parsedUrl.pathname,
                            protocol: `HTTP/${req.httpVersion}`,
                            sourceIp: req.socket.remoteAddress,
                            userAgent: req.headers['user-agent'] || ''
                        },
                        timeEpoch: Date.now()
                    },
                    isBase64Encoded: false,
                    body
                });
            });
        });
    }
}

module.exports = EventBuilder;
