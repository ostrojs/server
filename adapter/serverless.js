const url = require('url');
const { compose } = require('@ostro/support/compose');
class ServerLess {
    constructor(stacks) {
        this.$stack = compose(stacks.map(obj => obj.handle));
    }

    handle() {
        return (req, res) => {
            const parsedUrl = url.parse(req.url, true);

            const bodyChunks = [];
            req.on('data', chunk => bodyChunks.push(chunk));
            req.on('end', async () => {
                const body = Buffer.concat(bodyChunks).toString();

                const event = {
                    version: '2.0',
                    routeKey: `${parsedUrl.pathname}`,
                    rawPath: req.url.split('?')[0],
                    rawQueryString: parsedUrl.search ? parsedUrl.search.slice(1) : '',
                    headers: req.headers,
                    requestContext: {
                        accountId: '', // Fill as needed
                        apiId: '',     // Fill as needed
                        domainName: req.headers.host || '',
                        domainPrefix: req.headers.host ? req.headers.host.split('.')[0] : '',
                        http: {
                            method: req.method,
                            path: parsedUrl.pathname,
                            protocol: req.httpVersion ? `HTTP/${req.httpVersion}` : '',
                            sourceIp: req.connection?.remoteAddress || '',
                            userAgent: req.headers['user-agent'] || ''
                        },
                        requestId: '', // Fill as needed
                        routeKey: `${parsedUrl.pathname}`,
                        stage: '',     // Fill as needed
                        time: '',      // Fill as needed
                        timeEpoch: Date.now()
                    },
                    isBase64Encoded: false,
                    body,
                };
                const result = await this.$stack(event);
                res.writeHead(result.statusCode, result.headers);
                res.end(result.body);
            });
        }
    }
}

module.exports = ServerLess;    