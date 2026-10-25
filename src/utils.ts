export function logerror(err: unknown): void {
    if ((process.env.NODE_ENV || 'development') !== 'test') {
        console.error((err as Error).stack || (err as Error).toString());
    }
}

export const env: string = process.env.NODE_ENV || 'development';

export function call(
    handle: (...args: any[]) => any,
    route: string,
    err: unknown,
    req: unknown,
    res: unknown,
    next: (err?: unknown) => void
): void {
    const arity: number = handle.length;
    let error: unknown = err;
    const hasError: boolean = Boolean(err);

    try {
        if (hasError && arity === 4) {
            Promise.resolve(handle(err, req, res, next)).catch(next);
            return;
        } else if (!hasError && arity < 4) {
            Promise.resolve(handle(req, res, next)).catch(next);
            return;
        }
    } catch (e: unknown) {
        error = e;
    }
    next(error);
}

export function getProtohost(url: string): string | undefined {
    /**
     * if method.
     *
     * @param url - The URL string to parse
     * @returns The protohost or undefined
     */
    if (url.length === 0 || url[0] === '/') {
        return undefined;
    }

    const fqdnIndex: number = url.indexOf('://');

    return fqdnIndex !== -1 && url.lastIndexOf('?', fqdnIndex) === -1
        ? url.substr(0, url.indexOf('/', 3 + fqdnIndex))
        : undefined;
}

export const defer: (fn: (...args: any[]) => any, ...args: any[]) => void = typeof setImmediate === 'function'
    ? setImmediate
    : /**
       * fallback defer method using process.nextTick.
       *
       * @param fn - Function to defer
       */
      function (fn: (...args: any[]) => any, ...args: any[]): void {
          process.nextTick(fn, ...args);
      };

const utils = {
    logerror,
    env,
    call,
    getProtohost,
    defer
};

export default utils;
