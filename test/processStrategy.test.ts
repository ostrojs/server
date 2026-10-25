import { describe, test, expect, jest } from "@jest/globals";
const _ProcessStrategy = require("../src/serverless/strategies/processStrategy");
const ProcessStrategy = _ProcessStrategy.default || _ProcessStrategy;
const path = require("node:path");
const fs = require("node:fs");

describe("ProcessStrategy (serverless/strategies/processStrategy.js)", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/dummyHandler.js");

    test("runs handler in child process successfully and logs output", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        const logFixture = path.resolve(__dirname, "fixtures/logHandler.js");
        fs.writeFileSync(logFixture, "exports.run = async (e) => { console.log(\"handler-log\"); return { success: true }; };");
        try {
            const strategy = new ProcessStrategy();
            const result = await strategy.run(logFixture, "run", { a: 1 }, process.cwd());
            expect(result).toEqual({ success: true });
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("handler-log"));
        } finally {
            if (fs.existsSync(logFixture)) fs.unlinkSync(logFixture);
            consoleSpy.mockRestore();
        }
    });

    test("rejects when child process exits with non-zero code", async () => {
        const strategy = new ProcessStrategy();
        await expect(strategy.run(fixturePath, "nonExistent", {})).rejects.toThrow();

        // Non-zero exit code without stderr
        const silentFailFixture = path.resolve(__dirname, "fixtures/silentFail.js");
        fs.writeFileSync(silentFailFixture, "process.exit(2);");
        try {
            await expect(strategy.run(silentFailFixture, "run", {})).rejects.toThrow("Exit code 2");
        } finally {
            if (fs.existsSync(silentFailFixture)) fs.unlinkSync(silentFailFixture);
        }
    });

    test("rejects when output does not contain lambda markers", async () => {
        const noMarkerFixture = path.resolve(__dirname, "fixtures/noMarker.js");
        fs.writeFileSync(noMarkerFixture, "process.exit(0);");
        try {
            const strategy = new ProcessStrategy();
            await expect(strategy.run(noMarkerFixture, "run", {})).rejects.toThrow("No valid Lambda result found");
        } finally {
            if (fs.existsSync(noMarkerFixture)) fs.unlinkSync(noMarkerFixture);
        }
    });

    test("rejects when result JSON is corrupted", async () => {
        const badJsonFixture = path.resolve(__dirname, "fixtures/badJson.js");
        fs.writeFileSync(badJsonFixture, "process.stdout.write(\"\\n<<<__LAMBDA_RESULT__>>>\\n{bad_json\\n<<<__END__>>>\\n\"); process.exit(0);");
        try {
            const strategy = new ProcessStrategy();
            await expect(strategy.run(badJsonFixture, "run", {})).rejects.toThrow("Failed to parse Lambda result JSON");
        } finally {
            if (fs.existsSync(badJsonFixture)) fs.unlinkSync(badJsonFixture);
        }
    });
});