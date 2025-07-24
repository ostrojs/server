require('@ostro/support/helpers')
const ServerContract = require('@ostro/contracts/server/server')
const path = require('path');
const fs = require('fs')
const kSsl = Symbol('ssl')
const kServerType = Symbol('serverType')
const kHttpVersion = Symbol('httpversion')
const kStacks = Symbol('stack')
const Serverless = require('./adapter/serverless')
const HttpServer = require('./adapter/server');

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

    constructor({app,serverless}) {
        super()
        config = resolveConfig(app);
        this.$port = app.port || 8080;
        this.$host = app.host || '127.0.0.1';
        this[kHttpVersion] = app.http_version;
        this[kSsl] = app.ssl;
        this[kServerType] = 'server';
        this[kStacks] = [];
        Object.defineProperty(this, '$serverlessConfig', {
            value: serverless,
        });
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
            handle = function (req, res, next) {
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

    request(HttpRequest) {
        if (typeof HttpRequest != 'function') {
            throw new Error('HttpRequest class must be function/class')
        }
        Object.defineProperty(this, '$request', { value: HttpRequest })
        return this;
    }

    response(HttpResponse) {
        if (typeof HttpResponse != 'function') {
            throw new Error('HttpResponse class must function/class')
        }
        Object.defineProperty(this, '$response', { value: HttpResponse })
        return this;
    }

    handle() {
        if (this[kServerType] == 'serverless') {
            return (new Serverless(this.$serverlessConfig)).handle(this.$request, this.$response);
        } else if (this[kServerType] == 'server') {
            return (new HttpServer(this[kStacks])).handle(this.$request, this.$response);
        }
        throw new Error('Server type not supported');
    }

    type(type) {
        this[kServerType] = type;
        return this;
    }

    start(options = {}, cb) {
        var options = this.address(options)
        let httpConfig = httpTypes[this[kHttpVersion]]
        let http = require(httpConfig.module)
        let args = Array.from(arguments)
        options = args.find(arg => typeof arg == 'object') || {}
        cb = args.find(arg => typeof arg == 'function')

        options = typeof options === 'string' ? { port: options } : options;
        if (options.port) {
            this.$port = options.port
        }
        if (options.host) {
            this.$host = options.host
        }
        return http[httpConfig.starter](this.createServerConfig(), this.handle())
            .listen({ port: this.$port, host: this.$host }, () => {
                if (typeof cb == 'function') {
                    cb({
                        port: this.$port,
                        host: this.$host,
                        server: ''
                    })
                } else {
                    console.log(`Application Running on ${path.isAbsolute(this.$port.toString()) ? 'pipe : ' + this.$port : ': ' + this.$host + ':' + this.$port}`)
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
    if (config.port) {
        config.port = parseInt(config.port)
    }
    return config
}

module.exports = Server;
