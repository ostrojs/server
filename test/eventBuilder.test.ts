const _EventBuilder = require("../src/serverless/eventBuilder");
const EventBuilder = _EventBuilder.default || _EventBuilder;
const EventEmitter = require("events");

describe("EventBuilder (serverless/eventBuilder.js)", () => {
    test("builds event from http request with text body, cookies, query, params", async () => {
        const req = new EventEmitter();
        req.headers = {
            "content-type": "application/json",
            "cookie": "session=123; user=john",
            "user-agent": "jest-test"
        };
        req.url = "/api/items?cat=books&page=1";
        req.method = "POST";
        req.params = { id: "42" };
        req.socket = { remoteAddress: "127.0.0.1" };
        req.httpVersion = "1.1";

        const promise = EventBuilder.fromHttpRequest(req);
        req.emit("data", Buffer.from("{\"name\":"));
        req.emit("data", Buffer.from("\"item\"}"));
        req.emit("end");

        const event = await promise;
        expect(event.version).toBe("2.0");
        expect(event.routeKey).toBe("/api/items");
        expect(event.rawPath).toBe("/api/items?cat=books&page=1");
        expect(event.method).toBe("POST");
        expect(event.params).toEqual({ id: "42" });
        expect(event.query).toEqual({ cat: "books", page: "1" });
        expect(event.cookies).toEqual(["session=123", "user=john"]);
        expect(event.isBase64Encoded).toBe(false);
        expect(event.body).toBe("{\"name\":\"item\"}");
        expect(event.requestContext.http.sourceIp).toBe("127.0.0.1");
        expect(event.requestContext.http.userAgent).toBe("jest-test");
    });

    test("handles binary content types and missing optional properties", async () => {
        const req = new EventEmitter();
        req.headers = {
            "content-type": "image/png"
        };
        req.url = "/images/logo.png";
        req.method = "GET";
        req.socket = {};
        req.httpVersion = "2.0";

        const promise = EventBuilder.fromHttpRequest(req);
        const binaryBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
        req.emit("data", binaryBuffer);
        req.emit("end");

        const event = await promise;
        expect(event.isBase64Encoded).toBe(true);
        expect(event.body).toBe(binaryBuffer.toString("base64"));
        expect(event.cookies).toEqual([]);
        expect(event.rawQueryString).toBe("");
        expect(event.params).toEqual({});
        expect(event.requestContext.http.sourceIp).toBe("");
        expect(event.requestContext.http.userAgent).toBe("");
    });

    test("_isBinaryContent identifies text and binary types", () => {
        expect(EventBuilder._isBinaryContent("text/html")).toBe(false);
        expect(EventBuilder._isBinaryContent("application/json")).toBe(false);
        expect(EventBuilder._isBinaryContent("application/xml")).toBe(false);
        expect(EventBuilder._isBinaryContent("application/javascript")).toBe(false);
        expect(EventBuilder._isBinaryContent("application/x-www-form-urlencoded")).toBe(false);
        expect(EventBuilder._isBinaryContent("application/octet-stream")).toBe(true);
        expect(EventBuilder._isBinaryContent()).toBe(true);
    });
});