const url = require('url');
const { Buffer } = require('buffer');

class EventBuilder {
    static fromHttpRequest(req) {
        return new Promise((resolve) => {
            const bodyChunks = [];
            req.on('data', chunk => bodyChunks.push(chunk));
            req.on('end', () => {
                const rawBody = Buffer.concat(bodyChunks);
                const isBinary = EventBuilder._isBinaryContent(req.headers['content-type']);
                const body = isBinary ? rawBody.toString('base64') : rawBody.toString();

                const parsedUrl = url.parse(req.url, true);
                const headers = req.headers;

                const cookies = headers.cookie
                    ? headers.cookie.split(';').map(c => c.trim())
                    : [];

                resolve({
                    version: '2.0',
                    routeKey: parsedUrl.pathname,
                    rawPath: parsedUrl.pathname,
                    rawQueryString: parsedUrl.query
                        ? new URLSearchParams(parsedUrl.query).toString()
                        : '',
                    cookies,
                    headers,
                    requestContext: {
                        http: {
                            method: req.method,
                            path: parsedUrl.pathname,
                            protocol: `HTTP/${req.httpVersion}`,
                            sourceIp: req.socket.remoteAddress || '',
                            userAgent: headers['user-agent'] || '',
                        },
                        timeEpoch: Date.now(),
                    },
                    isBase64Encoded: isBinary,
                    body,
                });
            });
        });
    }

    static _isBinaryContent(contentType = '') {
        const textTypes = [
            'text/',
            'application/json',
            'application/xml',
            'application/javascript',
            'application/x-www-form-urlencoded',
        ];
        return !textTypes.some(t => contentType.startsWith(t));
    }
}

module.exports = EventBuilder;
