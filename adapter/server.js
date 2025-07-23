const { defer, call, logerror, getProtohost, env } = require('../utils');
const url = require('url');
const finalhandler = require('finalhandler');
class Server {
    constructor(stacks = []) {
        this.$stacks = stacks;
    }
    handle(Request, Response) {
        var errServer = {
            handle: (error, req, res, next) => {
                let status = 500
                if (error instanceof Error) {
                    status = error.status || 500
                    error = error.stack
                } else if (typeof error == 'object') {
                    status = error.status || 500
                    error = error
                }
                error = process.env['NODE_ENV'] != 'production' ? error : 'Whoops, looks like something went wrong.'
                res.send(`<pre>${error}</pre>`, status);
            },
            route: ''
        }
        var stack = this.$stacks.filter(({
            route,
            handle
        }) => {
            if (handle.length == 4) {
                errServer.handle = handle
                errServer.route = route
                return false
            }
            return true
        })
        stack.push(errServer)

        return (req, res, out) => {
            req = new Request(req)
            res = new Response(res)
            Object.defineProperty(res, 'request', { value: req })

            var index = 0;
            var protohost = getProtohost(req.url) || '';
            var removed = '';
            var slashAdded = false;

            var done = out || finalhandler(req, res, {
                env: env,
                onerror: logerror
            });
            req.originalUrl = req.originalUrl || req.url;
            req._parsedUrl = url.parse(req.url, false)

            function next(err) {
                if (slashAdded) {
                    req.url = req.url.substr(1);
                    slashAdded = false;
                }

                if (removed.length !== 0) {
                    req.url = protohost + removed + req.url.substr(protohost.length);
                    removed = '';
                }
                var layer = stack[index++];
                if (!layer) {
                    defer(done, err);
                    return;
                }
                var path = req.url || '/';
                var route = layer.route;

                if (path.toLowerCase().substr(0, route.length) !== route.toLowerCase()) {
                    return next(err);
                }
                var c = path.length > route.length && path[route.length];
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

                call(layer.handle, route, err, req, res, next);
            }
            req.next = next
            next();
        }
    }
}

module.exports = Server;
