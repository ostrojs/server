const _VmStrategy = require("../src/serverless/strategies/vmStrategy");
const VmStrategy = _VmStrategy.default || _VmStrategy;
const path = require("path");
const fs = require("fs");

describe("VmStrategy (serverless/strategies/vmStrategy.js)", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/dummyHandler.js");

    test("runs handler in VM context successfully", async () => {
        const strategy = new VmStrategy();
        const result = await strategy.run(fixturePath, "hello", { query: "test" });
        expect(result).toEqual({ statusCode: 200, body: "ok" });
    });

    test("runs handler when module exports function directly", async () => {
        const fnFixturePath = path.resolve(__dirname, "fixtures/fnHandler.js");
        fs.writeFileSync(fnFixturePath, "module.exports = async (e) => ({ body: e.data });");
        try {
            const strategy = new VmStrategy();
            const result = await strategy.run(fnFixturePath, "default", { data: 42 });
            expect(result).toEqual({ body: 42 });
        } finally {
            if (fs.existsSync(fnFixturePath)) fs.unlinkSync(fnFixturePath);
        }
    });

    test("throws error when handler is not a function", async () => {
        const strategy = new VmStrategy();
        await expect(strategy.run(fixturePath, "notAFunction", {})).rejects.toThrow('Handler "notAFunction" is not a function');
    });
});