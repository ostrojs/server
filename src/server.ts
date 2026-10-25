import ServerContract from '@ostro/contracts/server/server';
import { isAbsolute as pathIsAbsolute, resolve as pathResolve } from 'node:path';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import Serverless from './adapter/serverless';
import HttpServer from './adapter/server';

interface HttpStarterConfig {
    module: any;
    starter: string;
}

const httpTypes: Record<string, HttpStarterConfig> = {
    http2: {
        module: http2,
        starter: 'createServer',
    },
    https2: {
        module: http2,
        starter: 'createSecureServer',
    },
    https: {
        module: https,
        starter: 'createServer',
    },
    http: {
        module: http,
        starter: 'createServer',
    }
};

function creatSslConfig(ssl: any, httpVersion: string): Record<string, any> {
    const obj: Record<string, any> = Object.create(null);
    /**
     * switch method.
     *
     * @param httpVersion - HTTP protocol version
     * @returns SSL configuration object
     */
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
    return obj;
}

class Server extends ServerContract {
    public $port: number | string;
    public $host: string;
    public $serverlessConfig?: any;
    public $request?: any;
    public $response?: any;
    #httpVersion: string;
    #ssl: any;
    #serverType: string;
    #stacks: any[];

    /**
     * constructor method.
     *
     * @param options - Server configuration options
     */
    constructor({ app, serverless }: Record<string, any> = {}) {
        super();
        const config: any = resolveConfig(app);
        this.$port = config.port !== undefined ? config.port : 8080;
        this.$host = config.host || '127.0.0.1';
        this.#httpVersion = config.http_version;
        this.#ssl = config.ssl;
        this.#serverType = 'server';
        this.#stacks = [];
        this.$serverlessConfig = serverless;
    }

    /**
     * register method.
     *
     * @param path - Route path or middleware handler
     * @param handle - Middleware handler or array of handlers
     * @returns Server instance
     */
    public register(path: string | any, handle?: any): this {
        if (typeof path !== 'string') {
            handle = path;
            path = '/';
        }
        path = ('/' + path).replace(/\/\//g, "/").replace(/\/$/, "");
        if (Array.isArray(handle)) {
            for (let cb of handle) {
                this.#stacks.push({
                    route: path,
                    handle: cb
                });
            }
            return this;
        }
        if (typeof handle.handle === 'function') {
            const server: any = handle;
            server.route = path;
            handle = function (req: any, res: any, next: (err?: unknown) => void): void {
                server.handle(req, res, next);
            };
        }

        this.#stacks.push({
            route: path,
            handle: handle
        });

        return this;
    }

    /**
     * createServerConfig method.
     *
     * @returns Server SSL/TLS configuration object
     */
    public createServerConfig(): Record<string, any> {
        return Object.assign(creatSslConfig(this.#ssl, this.#httpVersion));
    }

    /**
     * address method.
     *
     * @param options - Address options
     * @returns Resolved socket path or address object
     */
    public address(options: Record<string, any> = {}): any {
        if (pathIsAbsolute(String(options.port || ' '))) {
            return options.port;
        } else {
            return {
                port: options.port !== undefined ? options.port : this.$port,
                host: options.host !== undefined ? options.host : this.$host,
                cert: options.cert,
                key: options.key
            };
        }
    }

    /**
     * request method.
     *
     * @param HttpRequest - Request class/constructor
     * @returns Server instance
     */
    public request(HttpRequest: any): this {
        if (typeof HttpRequest != 'function') {
            throw new Error('HttpRequest class must be function/class');
        }
        Object.defineProperty(this, '$request', { value: HttpRequest });
        return this;
    }

    /**
     * response method.
     *
     * @param HttpResponse - Response class/constructor
     * @returns Server instance
     */
    public response(HttpResponse: any): this {
        if (typeof HttpResponse != 'function') {
            throw new Error('HttpResponse class must function/class');
        }
        Object.defineProperty(this, '$response', { value: HttpResponse });
        return this;
    }

    /**
     * handle method.
     *
     * @returns Request dispatcher function
     */
    public handle(): (...args: any[]) => any {
        if (this.#serverType == 'serverless') {
            return (new Serverless(this.$serverlessConfig)).handle(this.$request, this.$response);
        } else if (this.#serverType == 'server') {
            return (new HttpServer(this.#stacks)).handle(this.$request, this.$response);
        }
        throw new Error('Server type not supported');
    }

    /**
     * type method.
     *
     * @param type - Server type ('server' or 'serverless')
     * @returns Server instance
     */
    public type(type: string): this {
        this.#serverType = type;
        return this;
    }

    /**
     * start method.
     *
     * @param options - Listen options or callback
     * @param cb - Callback function
     * @returns Server instance
     */
    start(options?: Record<string, any> | string | ((info: any) => void), cb?: any): any {
        const args: any[] = Array.from(arguments);
        let rawOptions: any = args.find((arg: any) => typeof arg == 'object' || typeof arg == 'string') || {};
        cb = args.find((arg: any) => typeof arg == 'function');
        rawOptions = typeof rawOptions === 'string' ? { port: rawOptions } : rawOptions;
        const resolvedAddress: any = this.address(rawOptions);
        const httpConfig: HttpStarterConfig = httpTypes[this.#httpVersion];
        const httpModule: any = httpConfig.module;

        if (typeof resolvedAddress === 'string') {
            this.$port = resolvedAddress;
        } else {
            this.$port = resolvedAddress.port;
            this.$host = resolvedAddress.host;
        }
        const listenTarget: any = pathIsAbsolute(this.$port.toString()) ? this.$port : { port: this.$port, host: this.$host };
        return httpModule[httpConfig.starter](this.createServerConfig(), this.handle())
            .listen(listenTarget, () => {
                if (typeof cb == 'function') {
                    cb({
                        port: this.$port,
                        host: this.$host,
                        server: ''
                    });
                } else {
                    console.log(`Application Running on ${pathIsAbsolute(this.$port.toString()) ? 'pipe : ' + this.$port : ': ' + this.$host + ':' + this.$port}`);
                }
            });
    }
}

function resolveConfig(config: Record<string, any> = {}): Record<string, any> {
    config.ssl = {
        'key': undefined,
        'cert': undefined,
        ...(config.ssl || {})
    };
    config.http_version = config.http_version || 'http';
    /**
     * if method.
     *
     * @param config.http_version - HTTP protocol version
     * @returns Resolved configuration
     */
    if (config.http_version == 'https' || config.http_version == "https2") {
        if (typeof config.ssl.key == 'string') {
            config.ssl.key = pathIsAbsolute(config.ssl.key) ? readFileSync(config.ssl.key) : readFileSync(pathResolve(config.ssl.key));
        }
        if (typeof config.ssl.cert == 'string') {
            config.ssl.cert = pathIsAbsolute(config.ssl.cert) ? readFileSync(config.ssl.cert) : readFileSync(pathResolve(config.ssl.cert));
        }
        if (typeof config.ssl.ca == 'string') {
            config.ssl.ca = pathIsAbsolute(config.ssl.ca) ? readFileSync(config.ssl.ca) : readFileSync(pathResolve(config.ssl.ca));
        }
    }
    /**
     * if method.
     *
     * @param config.port - Server port
     * @returns Resolved configuration
     */
    if (config.port !== undefined) {
        config.port = parseInt(config.port);
    }
    return config;
}

export default Server;