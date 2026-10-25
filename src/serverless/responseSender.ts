export interface LambdaResult {
    statusCode?: number;
    headers?: Record<string, any>;
    cookies?: string[];
    isBase64Encoded?: boolean;
    body?: string | null;
    [key: string]: unknown;
}

class ResponseSender {
    /**
     * sendSuccess method.
     *
     * @param res - HTTP response object
     * @param result - Lambda execution result
     */
    static sendSuccess(res: any, result: LambdaResult): void {
        if (result.cookies) {
            result.headers = result.headers || {};
            result.headers['Set-Cookie'] = result.cookies;
        }
        res.writeHead(result.statusCode || 200, result.headers || {});
        if (result.isBase64Encoded) {
            const buffer: Buffer = Buffer.from(result.body || '', 'base64');
            res.end(buffer);
        } else {
            res.end(result.body || '');
        }
    }

    /**
     * sendError method.
     *
     * @param res - HTTP response object
     * @param err - Error or error message
     */
    static sendError(res: any, err: unknown): void {
        const message: string = err && typeof (err as Error).message === 'string'
            ? (err as Error).message
            : String(err);
        if (typeof res.send === 'function') {
            return res.send(message, 500);
        }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
    }
}

export { ResponseSender };
export default ResponseSender;
