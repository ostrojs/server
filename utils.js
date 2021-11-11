exports.logerror = function logerror(err) {
    if (env !== 'test') console.error(err.stack || err.toString());
}

exports.env = env

exports.call = function call(handle, route, err, req, res, next) {
    var arity = handle.length;
    var error = err;
    var hasError = Boolean(err);

    try {
        if (hasError && arity === 4) {
            Promise.resolve(handle(err, req, res, next)).catch(next);
            return;
        } else if (!hasError && arity < 4) {
            Promise.resolve(handle(req, res, next)).catch(next);
            return;
        }
    } catch (e) {
        error = e;
    }
    next(error);
}

exports.getProtohost = function getProtohost(url) {
    if (url.length === 0 || url[0] === '/') {
        return undefined;
    }

    var fqdnIndex = url.indexOf('://')

    return fqdnIndex !== -1 && url.lastIndexOf('?', fqdnIndex) === -1 ?
        url.substr(0, url.indexOf('/', 3 + fqdnIndex)) :
        undefined;
}

exports.defer = typeof setImmediate === 'function' ?
    setImmediate :
    function(fn) {
        process.nextTick(fn.bind.apply(fn, arguments))
    }

