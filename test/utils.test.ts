const _utils = require('../src/utils');
const utils = _utils.default || _utils;

describe('server utils', () => {
    test('logerror logs error when env is not test', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        // env is 'test' under jest by default, so it shouldn't log
        utils.logerror(new Error('test err'));
        expect(consoleSpy).not.toHaveBeenCalled();

        // test with env !== 'test'
        const origEnv = process.env.NODE_ENV;
        delete require.cache[require.resolve('../src/utils')];
        process.env.NODE_ENV = 'development';
        const _reloadedUtils = require('../src/utils');
const reloadedUtils = _reloadedUtils.default || _reloadedUtils;
        
        reloadedUtils.logerror(new Error('dev err'));
        expect(consoleSpy).toHaveBeenCalled();

        // string error without stack
        consoleSpy.mockClear();
        reloadedUtils.logerror('plain string error');
        expect(consoleSpy).toHaveBeenCalledWith('plain string error');

        // test when process.env.NODE_ENV is empty/undefined
        delete process.env.NODE_ENV;
        jest.isolateModules(() => {
            const _noEnvUtils = require('../src/utils');
const noEnvUtils = _noEnvUtils.default || _noEnvUtils;
            expect(noEnvUtils.env).toBe('development');
            noEnvUtils.logerror(new Error('no env err'));
        });
        expect(consoleSpy).toHaveBeenCalled();

        // restore
        process.env.NODE_ENV = origEnv;
        delete require.cache[require.resolve('../src/utils')];
        consoleSpy.mockRestore();
    });

    test('call executes 4-arity handler on error and catches sync/async exceptions', async () => {
        let called4 = false;
        const h4 = (err, req, res, next) => {
            called4 = true;
            next();
        };
        const nextMock = jest.fn();
        utils.call(h4, '/', new Error('boom'), {}, {}, nextMock);
        expect(called4).toBe(true);

        // Async handler rejection with arity 4
        const rejectingH4 = (err, req, res, next) => {
            return Promise.reject(new Error('async err'));
        };
        const asyncNext4 = jest.fn();
        utils.call(rejectingH4, '/', new Error('err'), {}, {}, asyncNext4);
        await Promise.resolve();
        expect(asyncNext4).toHaveBeenCalled();

        // Sync throw in arity 4
        const throwingH4 = (err, req, res, next) => {
            throw new Error('sync throw');
        };
        const syncNext4 = jest.fn();
        utils.call(throwingH4, '/', new Error('err'), {}, {}, syncNext4);
        expect(syncNext4).toHaveBeenCalled();
    });

    test('call executes < 4 arity handler when no error', async () => {
        let called3 = false;
        const h3 = (req, res, next) => {
            called3 = true;
            next();
        };
        const nextMock = jest.fn();
        utils.call(h3, '/', null, {}, {}, nextMock);
        expect(called3).toBe(true);

        // Async rejection in arity < 4
        const rejectingH3 = (req, res, next) => {
            return Promise.reject(new Error('async reject'));
        };
        const asyncNext3 = jest.fn();
        utils.call(rejectingH3, '/', null, {}, {}, asyncNext3);
        await Promise.resolve();
        expect(asyncNext3).toHaveBeenCalled();

        // Sync throw in arity < 4
        const throwingH3 = (req, res, next) => {
            throw new Error('sync err 3');
        };
        const syncNext3 = jest.fn();
        utils.call(throwingH3, '/', null, {}, {}, syncNext3);
        expect(syncNext3).toHaveBeenCalled();

        // Handler mismatch: error present with arity < 4
        const mismatchNext = jest.fn();
        utils.call(h3, '/', new Error('mismatch'), {}, {}, mismatchNext);
        expect(mismatchNext).toHaveBeenCalledWith(expect.any(Error));
    });

    test('getProtohost parses fully qualified url or returns undefined', () => {
        expect(utils.getProtohost('')).toBeUndefined();
        expect(utils.getProtohost('/')).toBeUndefined();
        expect(utils.getProtohost('/foo/bar')).toBeUndefined();
        expect(utils.getProtohost('no-protocol-here')).toBeUndefined();
        expect(utils.getProtohost('?query=1://')).toBeUndefined();
        expect(utils.getProtohost('http://localhost:3000/path')).toBe('http://localhost:3000');
    });

    test('defer invokes callback asynchronously', (done) => {
        utils.defer((arg) => {
            expect(arg).toBe('ok');
            done();
        }, 'ok');
    });

    test('defer falls back to process.nextTick when setImmediate is not a function', (done) => {
        const origSetImmediate = global.setImmediate;
        const origSetImmediateDesc = Object.getOwnPropertyDescriptor(global, 'setImmediate');
        try {
            delete global.setImmediate;
            global.setImmediate = undefined;
            jest.isolateModules(() => {
                const _utilsFallback = require('../src/utils');
const utilsFallback = _utilsFallback.default || _utilsFallback;
                utilsFallback.defer((val) => {
                    expect(val).toBe('fallback');
                    done();
                }, 'fallback');
            });
        } finally {
            if (origSetImmediateDesc) {
                Object.defineProperty(global, 'setImmediate', origSetImmediateDesc);
            } else {
                global.setImmediate = origSetImmediate;
            }
        }
    });
});
