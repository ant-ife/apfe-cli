const chalk = require('chalk');
const Metalsmith = require('metalsmith');
const Handlebars = require('handlebars');
const async = require('async');
const { handlebars } = require('consolidate');
const path = require('path');
const multimatch = require('multimatch');
const getOptions = require('./options');
const getMetadata = getOptions.getMetadata;
const logger = require('./logger');
const ask = require('./ask');
const filter = require('./filter');
const uuid = require('uuid/v4');
const { readJsonSync } = require('fs-extra');
const { existsFile } = require('./exists');

const render = handlebars.render;
const defaultMeta = (modules = [], dest) => {
  const result = {};
  modules.forEach(module => {
    // if (module === 'offline-package') {
    //   result['offline'] = true
    // } else {
    //   result[module] = true
    // }
    result[module] = true;
  });
  return Object.assign(result, {
    destDirName: modules.join('-'),
    inPlace: dest === process.cwd(),
    noEscape: true,
  });
};

// register handlebars helper
Handlebars.registerHelper('if_eq', function (a, b, opts) {
  return a === b
    ? opts.fn(this)
    : opts.inverse(this);
});

Handlebars.registerHelper('unless_eq', function (a, b, opts) {
  return a === b
    ? opts.inverse(this)
    : opts.fn(this);
});

Handlebars.registerHelper('toUpperCase', function (str) {
  return str.toUpperCase();
});

Handlebars.registerHelper('uuid', uuid);

/**
 * Generate a template given a `src` and `dest`.
 *
 * @param {String} name
 * @param {String} src
 * @param {String} dest
 * @param {Function} done
 */
function generate (name, src, dest, done) {
  const opts = getOptions(name, src);
  const metalsmith = Metalsmith(path.join(src, 'template'));
  const data = Object.assign(metalsmith.metadata(), {
    babel: true,
    lint: true,
    vendor: true,
    webpack: true,
    destDirName: name,
    inPlace: dest === process.cwd(),
    noEscape: true,
  });
  opts.helpers && Object.keys(opts.helpers).map(function (key) {
    Handlebars.registerHelper(key, opts.helpers[key]);
  });

  const helpers = { chalk, logger };

  if (opts.metalsmith && typeof opts.metalsmith.before === 'function') {
    opts.metalsmith.before(metalsmith, opts, helpers);
  }

  metalsmith.use(askQuestions(opts.prompts))
    .use(filterFiles(opts.filters))
    .use(renderTemplateFiles(opts.skipInterpolation));

  if (typeof opts.metalsmith === 'function') {
    opts.metalsmith(metalsmith, opts, helpers);
  } else if (opts.metalsmith && typeof opts.metalsmith.after === 'function') {
    opts.metalsmith.after(metalsmith, opts, helpers);
  }

  metalsmith.clean(false)
    .source('.') // start from template root instead of `./src` which is Metalsmith's default for `source`
    .destination(dest)
    .build((err, files) => {
      done(err);
      if (typeof opts.complete === 'function') {
        const helpers = { chalk, logger, files };
        opts.complete(data, dest, helpers);
      }

      if (typeof opts.completeMessage === 'string') {
        logMessage(opts.completeMessage, data);
      }
    });
  return data;
}

/**
 * Generate a template given a `src` and `dest`.
 *
 * @param {Array} modules
 * @param {String} src
 * @param {String} dest
 * @param {String} originDir
 */
function generateUpdate (modules = [],
  src,
  dest,
  originDir = process.cwd()) {
  return new Promise((resolve, reject) => {
    const opts = getMetadata(src);
    const metalsmith = Metalsmith(path.join(src, 'template'));
    const modulesMeta = modules.reduce((a, b) => {
      a[b] = true;
      return a;
    }, {});
    const data = Object.assign(
      metalsmith.metadata(),
      defaultMeta(modules, dest),
      originMeta(originDir),
      modulesMeta,
    );
    opts.helpers && Object.keys(opts.helpers).map(function (key) {
      Handlebars.registerHelper(key, opts.helpers[key]);
    });

    const helpers = { chalk, logger };
    if (opts.metalsmith && typeof opts.metalsmith.before === 'function') {
      opts.metalsmith.before(metalsmith, opts, helpers);
    }

    metalsmith
      .use(filterFiles(opts.filters))
      .use(renderTemplateFiles(opts.skipInterpolation));

    if (typeof opts.metalsmith === 'function') {
      opts.metalsmith(metalsmith, opts, helpers);
    } else if (opts.metalsmith && typeof opts.metalsmith.after === 'function') {
      opts.metalsmith.after(metalsmith, opts, helpers);
    }

    metalsmith.clean(false)
      .source('.')
      .destination(dest)
      .build(function (err, files) {
        if (err) reject(err);
        resolve({
          meta: data,
          opts,
        });
      });
  });
}

function originMeta (dir) {
  const oriJson = readJsonSync(
    path.resolve(dir, './package.json'),
    { throws: false }
  ) || {};
  const origin = {
    flow: false,
    test: false,
    // offline: false,
  };

  if (existsFile(path.join(dir, 'flow-typed/modules.js')) &&
    existsFile(path.join(dir, '.flowconfig'))) {
    origin.flow = true;
  }

  if (existsFile(path.join(dir, 'test/unit/index.js'))) {
    origin.test = true;
  }

  // if (existsFile(path.join(dir, 'offline-package'))) {
  //   origin.offline = true
  // }

  return Object.assign({
    name: oriJson.name,
    description: oriJson.description,
    author: oriJson.author,
  }, origin);
}


/**
 * Create a middleware for asking questions.
 *
 * @param {Object} prompts
 * @return {Function}
 */
function askQuestions (prompts) {
  return function (files, metalsmith, done) {
    ask(prompts, metalsmith.metadata(), done);
  };
}

/**
 * Create a middleware for filtering files.
 *
 * @param {Object} filters
 * @return {Function}
 */
function filterFiles (filters) {
  return function (files, metalsmith, done) {
    filter(files, filters, metalsmith.metadata(), done);
  };
}

function renderTemplateFiles (skipInterpolation) {
  skipInterpolation = typeof skipInterpolation === 'string'
    ? [skipInterpolation]
    : skipInterpolation;
  return function (files, metalsmith, done) {
    const keys = Object.keys(files);
    const metalsmithMetadata = metalsmith.metadata();
    async.each(keys, function (file, next) {
      // skipping files with skipInterpolation option
      if (skipInterpolation &&
        multimatch([file], skipInterpolation, { dot: true }).length) {
        return next();
      }
      const str = files[file].contents.toString();
      // do not attempt to render files that do not have mustaches
      if (!/{{([^{}]+)}}/g.test(str)) {
        return next();
      }
      render(str, metalsmithMetadata, function (err, res) {
        if (err) {
          err.message = `[${file}] ${err.message}`;
          return next(err);
        }
        files[file].contents = new Buffer(res);
        next();
      });
    }, done);
  };
}

/**
 * Display template complete message.
 *
 * @param {String} message
 * @param {Object} data
 */

function logMessage (message, data) {
  if (!message) return;
  render(message, data, function (err, res) {
    if (err) {
      console.error('\n   Error when rendering template complete message: ' + err.message.trim());
    } else {
      console.log('\n' + res.split(/\r?\n/g).map(function (line) {
        return '   ' + line;
      }).join('\n'));
    }
  });
}

module.exports.generate = generate;
module.exports.generateUpdate = generateUpdate;
