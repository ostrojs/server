const _Server = require("../src/server");
const Server = _Server.default || _Server;
const fs = require("fs");
const path = require("path");
const http = require("http");

class MockRequest {
    constructor(req) {
        Object.assign(this, req);
    }
}

class MockResponse {
    constructor(res) {
        Object.assign(this, res);
    }
    send() {}
}

describe("Server (server.js)", () => {
    test("initializes with default options when none provided", () => {
        const srv = new Server();
        expect(srv.$port).toBe(8080);
        expect(srv.$host).toBe("127.0.0.1");
    });

    test("initializes with custom app config", () => {
        const srv = new Server({
            app: {
                port: "3000",
                host: "0.0.0.0",
                http_version: "http",
                ssl: {}
            }
        });
        expect(srv.$port).toBe(3000);
        expect(srv.$host).toBe("0.0.0.0");
    });

    test("register adds route and handlers properly and invokes sub-server handler", () => {
        const srv = new Server();
        srv.register((req, res, next) => next());
        srv.register("/api", [
            (req, res, next) => next(),
            (req, res, next) => next()
        ]);
        const subServer = {
            handle: jest.fn((req, res, next) => next())
        };
        srv.register("/sub", subServer);
        srv.request(MockRequest);
        srv.response(MockResponse);
        const handler = srv.handle();
        handler({ url: "/sub" }, {}, () => {
            expect(subServer.handle).toHaveBeenCalled();
        });
    });

    test("request and response methods validate class type", () => {
        const srv = new Server();
        expect(() => srv.request("not a class")).toThrow("HttpRequest class must be function/class");
        expect(() => srv.response("not a class")).toThrow("HttpResponse class must function/class");
        srv.request(MockRequest);
        srv.response(MockResponse);
        expect(srv.$request).toBe(MockRequest);
        expect(srv.$response).toBe(MockResponse);
    });

    test("address method handles pipe and tcp addresses, with default and custom options", () => {
        const srv = new Server();
        const pipeAddr = srv.address({ port: "/tmp/test.sock" });
        expect(pipeAddr).toBe("/tmp/test.sock");
        const tcpAddr = srv.address({ port: 9000, host: "localhost", cert: "c", key: "k" });
        expect(tcpAddr).toEqual({
            port: 9000,
            host: "localhost",
            cert: "c",
            key: "k"
        });
        const defaultTcp = srv.address();
        expect(defaultTcp).toEqual({
            port: 8080,
            host: "127.0.0.1",
            cert: undefined,
            key: undefined
        });
    });

    test("type method updates server type and handle returns appropriate dispatcher", () => {
        const srv = new Server();
        srv.request(MockRequest);
        srv.response(MockResponse);
        const serverHandler = srv.handle();
        expect(typeof serverHandler).toBe("function");
        srv.type("serverless");
        srv.$serverlessConfig = { handler: path.resolve(__dirname, "fixtures/dummyHandler.js") + ".hello" };
        const serverlessHandler = srv.handle();
        expect(typeof serverlessHandler).toBe("function");
        srv.type("unsupported");
        expect(() => srv.handle()).toThrow("Server type not supported");
    });

    test("creatSslConfig and resolveConfig handle https and https2 with relative/absolute paths", () => {
        const tmpKey = path.join(__dirname, "temp_test.key");
        const tmpCert = path.join(__dirname, "temp_test.crt");
        const tmpCa = path.join(__dirname, "temp_test.ca");
        fs.writeFileSync(tmpKey, "KEY_CONTENT");
        fs.writeFileSync(tmpCert, "CERT_CONTENT");
        fs.writeFileSync(tmpCa, "CA_CONTENT");
        try {
            const srvHttps = new Server({
                app: {
                    http_version: "https",
                    ssl: {
                        key: tmpKey,
                        cert: tmpCert,
                        ca: tmpCa
                    }
                }
            });
            const cfg = srvHttps.createServerConfig();
            expect(cfg.key.toString()).toBe("KEY_CONTENT");
            expect(cfg.cert.toString()).toBe("CERT_CONTENT");
            expect(cfg.ca.toString()).toBe("CA_CONTENT");
            const relKey = path.relative(process.cwd(), tmpKey);
            const relCert = path.relative(process.cwd(), tmpCert);
            const relCa = path.relative(process.cwd(), tmpCa);
            const srvHttps2 = new Server({
                app: {
                    http_version: "https2",
                    ssl: {
                        key: relKey,
                        cert: relCert,
                        ca: relCa
                    }
                }
            });
            const cfg2 = srvHttps2.createServerConfig();
            expect(cfg2.key.toString()).toBe("KEY_CONTENT");
            expect(cfg2.cert.toString()).toBe("CERT_CONTENT");
            expect(cfg2.ca.toString()).toBe("CA_CONTENT");
            // Test https when ssl has non-strings or undefined
            const srvHttpsNonString = new Server({
                app: {
                    http_version: "https",
                    ssl: { key: Buffer.from("k"), cert: null, ca: 123 }
                }
            });
            const cfgNonString = srvHttpsNonString.createServerConfig();
            expect(cfgNonString.key.toString()).toBe("k");
            const srvHttp = new Server({
                app: {
                    http_version: "http"
                }
            });
            const cfgHttp = srvHttp.createServerConfig();
            expect(cfgHttp).toEqual({});
        } finally {
            if (fs.existsSync(tmpKey)) fs.unlinkSync(tmpKey);
            if (fs.existsSync(tmpCert)) fs.unlinkSync(tmpCert);
            if (fs.existsSync(tmpCa)) fs.unlinkSync(tmpCa);
        }
    });

    test("start binds and runs server with callback and options", (done) => {
        const srv = new Server();
        srv.request(MockRequest);
        srv.response(MockResponse);
        srv.register("/", (req, res) => {
            res.end("ok");
        });
        const instance = srv.start({ port: 0, host: "127.0.0.1" }, (info) => {
            expect(info.port).toBe(0);
            expect(info.host).toBe("127.0.0.1");
            instance.close(done);
        });
    });

    test("start accepts callback as first argument when options omitted", (done) => {
        const srv = new Server({ app: { port: 0, host: "127.0.0.1" } });
        srv.request(MockRequest);
        srv.response(MockResponse);
        const instance = srv.start((info) => {
            expect(info.port).toBe(0);
            instance.close(done);
        });
    });

    test("start logs message when callback is omitted, and supports string port", (done) => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        const srv = new Server();
        srv.request(MockRequest);
        srv.response(MockResponse);
        const instance = srv.start("0");
        setTimeout(() => {
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
            instance.close(done);
        }, 50);
    });

    test("start logs message for pipe path when callback omitted", (done) => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        const srv = new Server();
        srv.request(MockRequest);
        srv.response(MockResponse);
        const pipePath = "/tmp/ostro_pipe_test_" + Date.now() + ".sock";
        const instance = srv.start({ port: pipePath });
        setTimeout(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("pipe : " + pipePath));
            consoleSpy.mockRestore();
            instance.close(() => {
                if (fs.existsSync(pipePath)) fs.unlinkSync(pipePath);
                done();
            });
        }, 50);
    });
});