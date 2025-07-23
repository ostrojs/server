const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

class VmStrategy {
  async run(modulePath, handlerName, event) {
    const resolvedModulePath = require.resolve(modulePath);
    const code = fs.readFileSync(resolvedModulePath, 'utf8');
    const moduleDir = path.dirname(resolvedModulePath);

    // Create a custom require function that works as Node does, relative to the module path
    const customRequire = Module.createRequire(resolvedModulePath);

    const sandbox = {
      console,
      require: customRequire,
      module: { exports: {} },
      exports: {},
      process,
      Buffer,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      __filename: resolvedModulePath,
      __dirname: moduleDir,
    };

    const context = vm.createContext(sandbox);
    const script = new vm.Script(code, { filename: resolvedModulePath });
    script.runInContext(context);

    const handler =
      typeof sandbox.exports === 'function'
        ? sandbox.exports
        : sandbox.module.exports[handlerName];

    if (typeof handler !== 'function') {
      throw new Error(`Handler "${handlerName}" is not a function`);
    }

    const result = await Promise.resolve(handler(event));
    return result;
  }
}

module.exports = VmStrategy;
