import { readFileSync } from 'fs';
import { dirname as pathDirname } from 'path';
import { createContext, Script, Context } from 'vm';
import { createRequire } from 'module';

class VmStrategy {
    /**
     * run method.
     *
     * @param modulePath - Handler module path
     * @param handlerName - Handler function name
     * @param event - Event payload
     * @param cwd - Working directory (optional)
     * @returns Promise resolving to handler result
     */
    public async run(modulePath: string, handlerName: string, event: unknown, cwd?: string): Promise<unknown> {
        const resolvedModulePath: string = require.resolve(modulePath);
        const code: string = readFileSync(resolvedModulePath, 'utf8');
        const moduleDir: string = pathDirname(resolvedModulePath);

        // Create a custom require function that works as Node does, relative to the module path
        const customRequire: NodeRequire = createRequire(resolvedModulePath);

        const moduleObj: { exports: any } = { exports: {} };
        const sandbox: Record<string, unknown> = {
            console,
            require: customRequire,
            module: moduleObj,
            exports: moduleObj.exports,
            process,
            Buffer,
            setTimeout,
            setInterval,
            clearTimeout,
            clearInterval,
            __filename: resolvedModulePath,
            __dirname: moduleDir,
        };

        const context: Context = createContext(sandbox);
        const script: Script = new Script(code, { filename: resolvedModulePath });
        script.runInContext(context);

        const handler: unknown = typeof moduleObj.exports === 'function'
            ? moduleObj.exports
            : moduleObj.exports[handlerName];

        if (typeof handler !== 'function') {
            throw new Error(`Handler "${handlerName}" is not a function`);
        }

        const result: unknown = await Promise.resolve((handler as Function)(event));
        return result;
    }
}

export { VmStrategy };
export default VmStrategy;
