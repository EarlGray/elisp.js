'use strict';

const ty = require('elisp/types');
const subr = require('elisp/subr');

/*
 *  Variables are handles to a value stack inside Environment
 *    (to have less keyed lookups in hot code)
 */
function Variable(stack, is_fun) {
  this.stack = stack;
  this.is_fun = is_fun;
}
/* PERF TODO: compare to properties */
Variable.prototype.get = function() { return this.stack[0]; }
Variable.prototype.set = function(val) { this.stack[0] = val; return val; }

/*
 *  Lisp Environment:
 */
function Environment(name) {
  this.name = name || 'env';

  /* functions: name->LispFun */
  this.fs = {};

  /* values: name -> stack of values */
  this.vs = {};
}

Environment.prototype.to_jsstring = function() {
  return 'global.' + this.name;
};

/*
 *  functions namespace
 */
Environment.prototype.fun = function(name) {
  let sub = subr.all[name];
  if (sub) {
    this.fs[name] = [sub];
  }
  return new Variable(this.fs[name], true);
}
Environment.prototype.fset = function(name, value) {
  if (this.fs[name] && this.fs[name].length) {
    this.fs[name][0] = value;
  } else {
    this.fs[name] = [value];
  }
  return value;
}

Environment.prototype.fget = function(name) {
  let stack = this.fs[name];
  if (stack && stack.length)
    return stack[0];
  let sub = subr.all[name];
  if (sub) {
    this.fs[name] = [sub];
    return sub;
  }
  throw new ty.LispError("Symbol's function definition is void: " + name);
}

/*
 *  values namespace
 */
Environment.prototype.var_ = function(name) {
  return new Variable(this.vs[name]);
}

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
  return subr.all[name] || this.fs[name] && this.fs[name].length;
};

Environment.prototype.has_jsdebug = function() {
  return !(this.is_bound('*jsdebug*') && !this.get('*jsdebug*').is_false);
};

exports.Environment = Environment;
