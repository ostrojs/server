const path = require('path');
const fs = require('fs');
const { spawn, fork } = require('child_process');
const { Worker } = require('worker_threads');

describe('Serverless Wrappers', () => {
    const defaultExportFixture = path.resolve(__dirname, 'fixtures/defaultExportHandler.js');
    const throwFixture = path.resolve(__dirname, 'fixtures/throwHandler.js');

    beforeAll(() => {
        fs.writeFileSync(defaultExportFixture, 'module.exports = async (event) => ({ handled: true, event });\n');
        fs.writeFileSync(throwFixture, 'exports.boom = async () => { throw new Error("Boom!"); };\n');
    });

    afterAll(() => {
        if (fs.existsSync(defaultExportFixture)) fs.unlinkSync(defaultExportFixture);
        if (fs.existsSync(throwFixture)) fs.unlinkSync(throwFixture);
    });

    describe('workerWrapper.js', () => {
        const workerWrapperPath = path.resolve(__dirname, '../src/serverless/wrappers/workerWrapper.js');

        test('executes handler when module exports a default function', (done) => {
            const child = spawn(process.execPath, [workerWrapperPath, defaultExportFixture, 'default']);
            let stdout = '';
            child.stdout.on('data', (d) => { stdout += d.toString(); });
            child.on('close', (code) => {
                expect(code).toBe(0);
                expect(stdout).toContain('<<<__LAMBDA_RESULT__>>>');
                expect(stdout).toContain('{"handled":true');
                done();
            });
            child.stdin.write(JSON.stringify({ event: { key: 'val' } }));
            child.stdin.end();
        });

        test('handles error thrown by handler', (done) => {
            const child = spawn(process.execPath, [workerWrapperPath, throwFixture, 'boom']);
            let stderr = '';
            child.stderr.on('data', (d) => { stderr += d.toString(); });
            child.on('close', (code) => {
                expect(code).toBe(1);
                expect(stderr).toContain('Boom!');
                done();
            });
            child.stdin.write(JSON.stringify({ event: {} }));
            child.stdin.end();
        });

        test('handles error when handler is string without stack', (done) => {
            const strThrowFixture = path.resolve(__dirname, 'fixtures/strThrow.js');
            fs.writeFileSync(strThrowFixture, 'exports.throwStr = () => { throw "Custom String Error"; };\n');
            const child = spawn(process.execPath, [workerWrapperPath, strThrowFixture, 'throwStr']);
            let stderr = '';
            child.stderr.on('data', (d) => { stderr += d.toString(); });
            child.on('close', (code) => {
                expect(code).toBe(1);
                expect(stderr).toContain('Custom String Error');
                if (fs.existsSync(strThrowFixture)) fs.unlinkSync(strThrowFixture);
                done();
            });
            child.stdin.write(JSON.stringify({ event: {} }));
            child.stdin.end();
        });
    });

    describe('threadWrapper.js', () => {
        const threadWrapperPath = path.resolve(__dirname, '../src/serverless/wrappers/threadWrapper.js');

        test('handles default export function and executes successfully', (done) => {
            const worker = new Worker(threadWrapperPath, {
                workerData: {
                    modulePath: defaultExportFixture,
                    handlerName: 'default',
                    event: { ok: true }
                }
            });
            worker.on('message', (res) => {
                expect(res).toEqual({ handled: true, event: { ok: true } });
                done();
            });
        });

        test('handles string error without stack', (done) => {
            const strThrowFixture = path.resolve(__dirname, 'fixtures/strThrowThread.js');
            fs.writeFileSync(strThrowFixture, 'exports.throwStr = () => { throw "String Error in Thread"; };\n');
            const worker = new Worker(threadWrapperPath, {
                workerData: {
                    modulePath: strThrowFixture,
                    handlerName: 'throwStr',
                    event: {}
                }
            });
            worker.on('message', (msg) => {
                expect(msg.error).toContain('String Error in Thread');
                if (fs.existsSync(strThrowFixture)) fs.unlinkSync(strThrowFixture);
                done();
            });
        });
    });

    describe('frokWrapper.js', () => {
        const frokWrapperPath = path.resolve(__dirname, '../src/serverless/wrappers/frokWrapper.js');

        test('handles default export function', (done) => {
            const child = fork(frokWrapperPath, [defaultExportFixture, 'default'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
            child.on('message', (msg) => {
                expect(msg.result).toEqual({ handled: true, event: { fork: true } });
                done();
            });
            child.send({ event: { fork: true } });
        });

        test('handles string error without stack', (done) => {
            const strThrowFixture = path.resolve(__dirname, 'fixtures/strThrowFork.js');
            fs.writeFileSync(strThrowFixture, 'exports.throwStr = () => { throw "String Error in Fork"; };\n');
            const child = fork(frokWrapperPath, [strThrowFixture, 'throwStr'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
            child.on('message', (msg) => {
                expect(msg.error).toContain('String Error in Fork');
                if (fs.existsSync(strThrowFixture)) fs.unlinkSync(strThrowFixture);
                done();
            });
            child.send({ event: {} });
        });
    });
});
