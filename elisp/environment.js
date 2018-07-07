'use strict';

const ty = require('elisp/types');
const subr = require('elisp/subr');

function Environment(name) {
  this.name = name || 'env';

  /* functions: name->LispFun */
  this.fs = {};

  /* values */
  this.vs = {};
}

Environment.prototype.to_jsstring = function() {
  return 'global.' + this.name;
};

/*
 *  functions namespace
 */
Environment.prototype.fset = function(name, value) {
  this.fs[name] = value;
  return value;
}

Environment.prototype.fget = function(name) {
  let fun = this.fs[name] || subr.all[name];
  if (!fun)
    throw new ty.LispError("Symbol's function definition is void: " + name);
  return fun;
}

/*
 *  values namespace
 */
Environment.prototype.set = function() {
  let i = 0;
  let value;
  while (i < arguments.length) {
    let name = arguments[i];
    value = arguments[i+1];

    if (this.vs[name] && this.vs[name].length) {
      this.vs[name][0] = value;
    } else {
      this.vs[name] = [value];
    }

    i += 2;
  }
  return value;
};

Environment.prototype.get = function(name) {
  if (this.vs[name])
    return this.vs[name][0];
  throw new ty.LispError("Symbol's value as variable is void: " + name);
};

Environment.prototype.push = function() {
  let i = 0;
  while (i < arguments.length) {
    let name = arguments[i];
    let value = arguments[i+1];

    if (this.vs[name] && this.vs[name].length) {
      this.vs[name].unshift(value);
    } else {
      this.vs[name] = [value];
    }

    i += 2;
  }
};

Environment.prototype.pop = function() {
  for (let i = 0; i < arguments.length; ++i) {
    let name = arguments[i];
    this.vs[name].shift();
  }
};

Environment.prototype.is_bound = function(name) {
  return this.vs[name] && this.vs[name].length;
};
Environment.prototype.is_fbound = function(name) {
  return this.fs[name];
};

Environment.prototype.has_jsdebug = function() {
  return !(this.is_bound('*jsdebug*') && !this.get('*jsdebug*').is_false);
};

exports.Environment = Environment;
