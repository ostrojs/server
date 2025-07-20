class ResponseSender {
    static sendSuccess(res, result) {
        res.writeHead(result.statusCode || 200, result.headers || {});
        res.end(result.body || '');
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
