const url = require('url');
const {compose} = require('@ostro/support/compose');
class ServerLess {
    constructor(stacks) {
        this.$stack = compose(stacks.map(obj=> obj.handle));
    }

    handle() {
        return (req, res) => {
            const parsedUrl = url.parse(req.url, true);

            const bodyChunks = [];
            req.on('data', chunk => bodyChunks.push(chunk));
            req.on('end', async () => {
                const body = Buffer.concat(bodyChunks).toString();

                const event = {
                    httpMethod: req.method,
                    path: parsedUrl.pathname,
                    headers: req.headers,
                    queryStringParameters: parsedUrl.query,
                    body,
                    isBase64Encoded: false,
                };
                const result = await this.$stack(event);
                res.writeHead(result.statusCode, result.headers);
                res.end(result.body);
            });
        }
    }
}

module.exports = ServerLess;    