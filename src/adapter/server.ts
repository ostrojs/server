import utils from '../utils';
import { parse as parseUrl } from 'node:url';
// @ts-ignore
import finalhandler from 'finalhandler';

interface StackLayer {
    route: string;
    handle: (...args: any[]) => any;
}

class Server {
    public $stacks: StackLayer[];

    /**
     * constructor method.
     *
     * @param stacks - Stack layer items
     */
    constructor(stacks: StackLayer[] = []) {
        this.$stacks = stacks;
    }

    /**
     * handle method.
     *
     * @param Request - Request constructor
     * @param Response - Response constructor
     * @returns HTTP request handler function
     */
    public handle(Request: any, Response: any): (rawReq: any, rawRes: any, out?: (err?: unknown) => void) => void {
        const errServer: StackLayer = {
            handle: (error: any, req: any, res: any, next: (err?: unknown) => void): void => {
                let status: number = 500;
                if (error instanceof Error) {
                    status = (error as Error & { status?: number }).status || 500;
                    error = error.stack;
                } else if (typeof error == 'object') {
                    status = (error as Error & { status?: number }).status || 500;
                    error = JSON.stringify(error);
                }
                error = process.env['NODE_ENV'] != 'production' ? error : 'Whoops, looks like something went wrong.';
                res.send(`<pre>${error}</pre>`, status);
            },
            route: ''
        };
        const stack: StackLayer[] = this.$stacks.filter(({
            route,
            handle
        }: StackLayer) => {
            if (handle.length == 4) {
                errServer.handle = handle;
                errServer.route = route;
                return false;
            }
            return true;
        });
        stack.push(errServer);

        return (rawReq: any, rawRes: any, out?: (err?: unknown) => void): void => {
            const req = new Request(rawReq);
            const res = new Response(rawRes);
            Object.defineProperty(res, 'request', { value: req });

            let index: number = 0;
            const protohost: string = utils.getProtohost(req.url) || '';
            let removed: string = '';
            let slashAdded: boolean = false;

            const done: (err?: unknown) => void = out || finalhandler(rawReq, rawRes, {
                env: utils.env,
                onerror: utils.logerror
            });
            req.originalUrl = req.originalUrl || req.url;
            req._parsedUrl = parseUrl(req.url, false);

            function next(err?: unknown): void {
                if (slashAdded) {
                    req.url = req.url.substr(1);
                    slashAdded = false;
                }

                if (removed.length !== 0) {
                    req.url = protohost + removed + req.url.substr(protohost.length);
                    removed = '';
                }
                const layer = stack[index++];
                if (!layer) {
                    if (!rawRes.headersSent && !res.headersSent) {
                        utils.defer(done, err);
                    }
                    return;
                }
                const path: string = (protohost ? req.url.substr(protohost.length) : req.url) || '/';
                const route: string = layer.route;

                if (path.toLowerCase().substr(0, route.length) !== route.toLowerCase()) {
                    return next(err);
                }
                const c: string | false = path.length > route.length && path[route.length];
                if (c && c !== '/' && c !== '.') {
                    return next(err);
                }
                if (route.length !== 0 && route !== '/') {
                    removed = route;
                    req.url = protohost + req.url.substr(protohost.length + removed.length);
                    if (!protohost && req.url[0] !== '/') {
                        req.url = '/' + req.url;
                        slashAdded = true;
                    }
                }

                utils.call(layer.handle, route, err, req, res, next);
            }
            req.next = next;
            next();
        };
    }
}

export default Server;
