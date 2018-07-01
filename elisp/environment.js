'use strict';

const ty = require('elisp/types');
const subr = require('elisp/subr');

function Environment(name) {
  this.fs = {};
  this.vs = {};
  this.name = name || 'env';
}

Environment.prototype.to_jsstring = function() {
  return 'global.' + this.name;
}

Environment.prototype.set = function() {
  let i = 0;
  let value;
  while (i < arguments.length) {
    let name = arguments[i];
    value = arguments[i+1];
    this.vs[name] = value;
    i += 2;
  }
  return value;
}

Environment.prototype.get = function(name) {
  if (name in this.vs)
    return this.vs[name];
  throw new Error("Symbol's value as variable is void: " + name);
}

Environment.prototype.fset = function(name, value) {
  this.fs[name] = value;
  return ty.symbol(name);
}

Environment.prototype.fget = function(name) {
  let fun = this.fs[name] || subr.all[name];
  if (!fun) 
    throw new Error("Symbol's function definition is void: " + name);
  fun.env = this;
  return fun;
}

exports.Environment = Environment;
