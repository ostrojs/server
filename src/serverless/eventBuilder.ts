import { parse as parseUrl, UrlWithParsedQuery } from 'node:url';
import { Buffer } from 'node:buffer';

interface LambdaEvent {
    version: string;
    routeKey: string | null;
    rawPath: string;
    url: string;
    query: any;
    rawQueryString: string;
    cookies: string[];
    headers: Record<string, any>;
    method: string;
    params: Record<string, any>;
    requestContext: {
        http: {
            method: string;
            path: string | null;
            protocol: string;
            sourceIp: string;
            userAgent: string;
        };
        timeEpoch: number;
    };
    isBase64Encoded: boolean;
    body: string;
}

class EventBuilder {
    /**
     * fromHttpRequest method.
     *
     * @param req - HTTP request object
     * @returns Promise resolving to LambdaEvent
     */
    static fromHttpRequest(req: any): Promise<LambdaEvent> {
        return new Promise((resolve) => {
            const bodyChunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => bodyChunks.push(chunk));
            req.on('end', () => {
                const rawBody: Buffer = Buffer.concat(bodyChunks);
                const isBinary: boolean = EventBuilder._isBinaryContent(req.headers['content-type']);
                const body: string = isBinary ? rawBody.toString('base64') : rawBody.toString();

                const parsedUrl: UrlWithParsedQuery = parseUrl(req.url, true);
                const headers: Record<string, any> = req.headers;

                const cookies: string[] = headers.cookie
                    ? headers.cookie.split(';').map((c: string) => c.trim())
                    : [];

                const query: any = parsedUrl.query;
                const rawQueryString: string = new URLSearchParams(query as Record<string, string>).toString();

                resolve({
                    version: '2.0',
                    routeKey: parsedUrl.pathname,
                    rawPath: req.url,
                    url: req.url,
                    query: query,
                    rawQueryString: rawQueryString,
                    cookies,
                    headers,
                    method: req.method,
                    params: req.params || {},
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

    /**
     * _isBinaryContent method.
     *
     * @param contentType - Content-Type header string
     * @returns True if content is binary
     */
    static _isBinaryContent(contentType: string = ''): boolean {
        const textTypes: string[] = [
            'text/',
            'application/json',
            'application/xml',
            'application/javascript',
            'application/x-www-form-urlencoded',
        ];
        return !textTypes.some((t: string) => contentType.startsWith(t));
    }
}

export { EventBuilder };
export default EventBuilder;
