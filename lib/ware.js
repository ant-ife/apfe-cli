module.exports = class Ware {
  constructor (fn) {
    this.fns = [];
    if (fn) this.use(fn);
  }

  use (fn) {
    if (fn instanceof Ware) {
      return this.use(fn.fns);
    }

    if (fn instanceof Array) {
      fn.forEach(f => this.use(f));
      return this;
    }

    this.fns.push(fn);
    return this;
  }

  run (...args) {
    return this.compose()(...args);
  }

  compose () {
    const middlewares = this.fns;
    const that = this;
    if (!Array.isArray(middlewares)) throw new TypeError('Middleware stack must be an array!');
    for (const fn of middlewares) {
      if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!');
    }

    return function (...args) {
      // last called middleware #
      let index = -1;
      return dispatch(0);

      function dispatch (i) {
        if (i <= index) return Promise.reject(new Error('next() called multiple times'));
        index = i;
        const fn = middlewares[i];
        if (!fn) return Promise.resolve();

        try {
          return Promise.resolve(fn.apply(that, args.concat(function next () {
            return dispatch(i + 1);
          })));
        } catch (err) {
          return Promise.reject(err);
        }
      }
    };
  }
};
