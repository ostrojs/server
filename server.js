require('@ostro/support/helpers')
const ServerContract = require('@ostro/contracts/server/server')
const finalhandler = require('finalhandler');
const path = require('path');
const url = require('url');
const fs = require('fs')
const kSsl = Symbol('ssl')
const kHttpServer = Symbol('httpServer')
const kHttpVersion = Symbol('httpversion')
const kStacks = Symbol('stack')

const {
    call,
    logerror,
    getProtohost,
    defer,
    env,
} = require('./utils');

var httpTypes = {
    http2: {
        module: 'http2',
        starter: 'createServer',
    },
    https2: {
        module: 'http2',
        starter: 'createSecureServer',
    },
    https: {
        module: 'https',
        starter: 'createServer',
    },
    http: {
        module: 'http',
        starter: 'createServer',
    }
}

function creatSslConfig(ssl, httpVersion) {
    let obj = Object.create(null)
    switch (httpVersion) {
        case 'https':
            obj.key = ssl.key;
            obj.cert = ssl.cert;
            obj.ca = ssl.ca;
            break;
        case 'https2':
            obj.key = ssl.key;
            obj.cert = ssl.cert;
            obj.ca = ssl.ca;
            break;
        default:
            break;
    }
    return obj

}
class Server extends ServerContract {

    constructor(config = {}) {
        super()
        config = resolveConfig(config);
        this.$port = config.port;
        this.$host = config.host;
        this[kHttpVersion] = config.http_version;
        this[kSsl] = config.ssl;
        this[kStacks] = [];
    }

    register(path, handle) {
        if (typeof path !== 'string') {
            handle = path;
            path = '/';
        }
        path = ('/' + path).replace(/\/\//g, "/").replace(/\/$/, "");
        if (Array.isArray(handle)) {
            for (let cb of handle) {
                this[kStacks].push({
                    route: path,
                    handle: cb
                });
            }
            return this
        }
        if (typeof handle.handle === 'function') {
            var server = handle;
            server.route = path;
            handle = function(req, res, next) {
                server.handle(req, res, next);
            };
        }

        this[kStacks].push({
            route: path,
            handle: handle
        });

        return this;
    }
    createServerConfig() {
        return Object.assign(creatSslConfig(this[kSsl], this[kHttpVersion]))
    }
   
    handle(HttpRequest = require('@ostro/http/request'), HttpResponse = require('@ostro/http/response')) {
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
        var stack = this[kStacks].filter(({
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
            req = new HttpRequest(req)
            res = new HttpResponse(res)
            Object.defineProperty(res, 'req', { value: req })

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
    
    address(options = {}) {
        if (path.isAbsolute(String(options.port || ' '))) {
            return options.port
        } else {
            return {
                port: exists((options.port), 8080),
                host: exists((options.host), '127.0.0.1'),
                cert: options.cert,
                key: options.key
            }

        }
    }

    request(HttpRequest ){
        if(typeof HttpRequest != 'function'){
            throw new Error('HttpRequest class must be function/class')
        }
        Object.defineProperty(this,'$request',{value:HttpRequest})
    }

    response(HttpResponse){
        if(typeof HttpResponse != 'function'){
            throw new Error('HttpResponse class must function/class')
        }
        Object.defineProperty(this,'$response',{value:HttpResponse})
    }

    start(options={},cb) {
        var options = this.address(options)
        let httpConfig = httpTypes[this[kHttpVersion]]
        let http = require(httpConfig.module)
        let args = Array.from(arguments)
        options = args.find(arg => typeof arg == 'object') || {}
        cb = args.find(arg => typeof arg == 'function')
       
        options = typeof options === 'string' ? { port: options } : options;
        if(options.port){
            this.$port = options.port
        }
        if(options.host){
            this.$host = options.host
        }
        return http[httpConfig.starter](this.createServerConfig(), this.handle(this.$request,this.$response))
            .listen({port:this.$port,host:this.$host}, () => {
            if (typeof cb == 'function') {
                cb({
                    port: this.$port,
                    host: this.$host,
                    server: ''
                })
            } else {
                console.log(`Application Running on ${path.isAbsolute(this.$port.toString())?'pipe : '+this.$port:': '+this.$host + ':' + this.$port}`)
            }
        });
    }
}

function resolveConfig(config = {}) {
    config.ssl = {
        'key': undefined,
        'cert': undefined,
        ...(config.ssl || {})
    }
    config.http_version = config.http_version || 'http'
    if (config.http_version == 'https' || config.http_version == "https2") {
        if (typeof config.ssl.key == 'string') {
            config.ssl.key = path.isAbsolute(config.ssl.key) ? fs.readFileSync(config.ssl.key) : fs.readFileSync(path.resolve(config.ssl.key));
        }
        if (typeof config.ssl.cert == 'string') {
            config.ssl.cert = path.isAbsolute(config.ssl.cert) ? fs.readFileSync(config.ssl.cert) : fs.readFileSync(path.resolve(config.ssl.cert));
        }
        if (typeof config.ssl.ca == 'string') {
            config.ssl.ca = path.isAbsolute(config.ssl.ca) ? fs.readFileSync(config.ssl.ca) : fs.readFileSync(path.resolve(config.ssl.ca));
        }
    }
    if(!config.port){
        config.port = 8000
    }
    if(!config.host){
        config.host = '127.0.0.1'
    }
    return config
}

module.exports = Server;