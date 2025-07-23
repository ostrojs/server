class ResponseSender {
    static sendSuccess(res, result) {
        if (result.cookies) {
            result.headers['Set-Cookie'] = result.cookies || [];
        }
        res.writeHead(result.statusCode || 200, result.headers || {});
        if (result.isBase64Encoded) {
            const buffer = Buffer.from(result.body || '', 'base64');
            res.end(buffer);
        } else {
            res.end(result.body || '');
        }
    }

    static sendError(res, err) {
        if (typeof err.message === 'string') {
            return res.send(err.message)
        }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

module.exports = ResponseSender;
