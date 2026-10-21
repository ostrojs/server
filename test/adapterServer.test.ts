const _HttpServer = require('../src/adapter/server');
const HttpServer = _HttpServer.default || _HttpServer;

class MockRequest {
    constructor(req) {
        Object.assign(this, req);
    }
}

class MockResponse {
    constructor(res) {
        Object.assign(this, res);
        res._mockResponse = this;
        this.sentData = null;
        this.sentStatus = null;
    }
    send(data, status) {
        this.sentData = data;
        this.sentStatus = status;
    }
}

describe('HttpServer (adapter/server.js)', () => {
    test('dispatches through stack handlers and executes out/done when finished', (done) => {
        let step1 = false;
        let step2 = false;
        const stacks = [
            {
                route: '/api',
                handle: (req, res, next) => {
                    step1 = true;
                    next();
                }
            },
            {
                route: '/api/v1',
                handle: (req, res, next) => {
                    step2 = true;
                    next();
                }
            }
        ];

        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        const rawReq = { url: '/api/v1/users', originalUrl: '/api/v1/users' };
        const rawRes = {};

        handler(rawReq, rawRes, (err) => {
            expect(err).toBeUndefined();
            expect(step1).toBe(true);
            expect(step2).toBe(true);
            done();
        });
    });

    test('skips layer when route does not match', (done) => {
        let adminCalled = false;
        let publicCalled = false;
        const stacks = [
            {
                route: '/admin',
                handle: (req, res, next) => {
                    adminCalled = true;
                    next();
                }
            },
            {
                route: '/public',
                handle: (req, res, next) => {
                    publicCalled = true;
                    next();
                }
            }
        ];

        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        handler({ url: '/public/view' }, {}, () => {
            expect(adminCalled).toBe(false);
            expect(publicCalled).toBe(true);
            done();
        });
    });

    test('skips layer when prefix matches but next character is not slash or dot', (done) => {
        let apiCalled = false;
        const stacks = [
            {
                route: '/api',
                handle: (req, res, next) => {
                    apiCalled = true;
                    next();
                }
            }
        ];

        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        // /apix matches prefix '/api' but next char is 'x'
        handler({ url: '/apix' }, {}, () => {
            expect(apiCalled).toBe(false);
            done();
        });
    });

    test('handles dot character after route e.g. /api.json', (done) => {
        let apiCalled = false;
        const stacks = [
            {
                route: '/api',
                handle: (req, res, next) => {
                    apiCalled = true;
                    next();
                }
            }
        ];

        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        handler({ url: '/api.json' }, {}, () => {
            expect(apiCalled).toBe(true);
            done();
        });
    });

    test('strips and restores route prefix and manages slashAdded with and without protohost', (done) => {
        let inspectedUrl = null;
        const stacks = [
            {
                route: '/prefix',
                handle: (req, res, next) => {
                    // /prefix/item -> after strip: /item
                    inspectedUrl = req.url;
                    next();
                }
            }
        ];

        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        const rawReq = { url: '/prefix/item' };
        handler(rawReq, {}, () => {
            expect(inspectedUrl).toBe('/item');
            // After next(), original url is restored
            expect(rawReq.url).toBe('/prefix/item');
            done();
        });
    });

    test('handles fully qualified url with protohost', (done) => {
        let inspectedUrl = null;
        const stacks = [
            {
                route: '/api',
                handle: (req, res, next) => {
                    inspectedUrl = req.url;
                    next();
                }
            }
        ];

        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        const rawReq = { url: 'http://localhost:3000/api/users' };
        handler(rawReq, {}, () => {
            expect(inspectedUrl).toBe('http://localhost:3000/users');
            expect(rawReq.url).toBe('http://localhost:3000/api/users');
            done();
        });
    });

    test('invokes custom 4-arity error handler from stacks', (done) => {
        let customErrHandled = false;
        const stacks = [
            {
                route: '/fail',
                handle: (req, res, next) => {
                    next(new Error('something failed'));
                }
            },
            {
                route: '/fail',
                handle: (err, req, res, next) => {
                    customErrHandled = true;
                    expect(err.message).toBe('something failed');
                    next();
                }
            }
        ];

        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        handler({ url: '/fail' }, {}, () => {
            expect(customErrHandled).toBe(true);
            done();
        });
    });

    test('default errServer handles Error instance and object error in development and production', (done) => {
        let errToTrigger = new Error('oops');
        errToTrigger.status = 503;

        const stacks = [
            {
                route: '',
                handle: (req, res, next) => {
                    next(errToTrigger);
                }
            }
        ];
        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const rawRes1 = {};
        handler({ url: '/err-test' }, rawRes1);

        setImmediate(() => {
            expect(rawRes1._mockResponse.sentStatus).toBe(503);
            expect(rawRes1._mockResponse.sentData).toContain('oops');

            // Test with plain object error
            errToTrigger = { status: 400, message: 'bad request' };
            const rawRes2 = {};
            handler({ url: '/err-obj' }, rawRes2);

            setImmediate(() => {
                expect(rawRes2._mockResponse.sentStatus).toBe(400);
                expect(rawRes2._mockResponse.sentData).toContain('bad request');

                // Test in production
                process.env.NODE_ENV = 'production';
                errToTrigger = new Error('secret fail');
                const rawRes3 = {};
                handler({ url: '/err-prod' }, rawRes3);

                setImmediate(() => {
                    expect(rawRes3._mockResponse.sentData).toBe('<pre>Whoops, looks like something went wrong.</pre>');
                    process.env.NODE_ENV = origEnv;
                    done();
                });
            });
        });
    });

    test('uses finalhandler when out/done callback is omitted', (done) => {
        const http = require('http');
        const stacks = [
            {
                route: '/empty',
                handle: (req, res, next) => {
                    next();
                }
            }
        ];
        const server = new HttpServer(stacks);
        function PassthroughReq(req) {
            Object.setPrototypeOf(this, req);
            Object.assign(this, req);
        }
        function PassthroughRes(res) {
            Object.setPrototypeOf(this, res);
            Object.assign(this, res);
        }
        const handler = server.handle(PassthroughReq, PassthroughRes);

        const srv = http.createServer((req, res) => {
            handler(req, res);
        });

        srv.listen(0, () => {
            const port = srv.address().port;
            http.get(`http://localhost:${port}/empty`, (res) => {
                expect(res.statusCode).toBe(404);
                srv.close(done);
            });
        });
    });

    test('constructor defaults stacks to empty array', () => {
        const server = new HttpServer();
        expect(server.$stacks).toEqual([]);
    });

    test('default errServer handles Error and object without status code, and handles string error', (done) => {
        let errToTrigger = new Error('no status');
        const stacks = [
            {
                route: '',
                handle: (req, res, next) => {
                    next(errToTrigger);
                }
            }
        ];
        const server = new HttpServer(stacks);
        const handler = server.handle(MockRequest, MockResponse);

        const res1 = {};
        handler({ url: '' }, res1);
        setImmediate(() => {
            expect(res1._mockResponse.sentStatus).toBe(500);

            // Object error without status
            errToTrigger = { message: 'no status obj' };
            const res2 = {};
            handler({ url: '' }, res2);
            setImmediate(() => {
                expect(res2._mockResponse.sentStatus).toBe(500);

                // String/primitive error
                errToTrigger = 'simple string error';
                const res3 = {};
                handler({ url: '' }, res3);
                setImmediate(() => {
                    expect(res3._mockResponse.sentStatus).toBe(500);
                    expect(res3._mockResponse.sentData).toBe('<pre>simple string error</pre>');
                    done();
                });
            });
        });
    });
});
