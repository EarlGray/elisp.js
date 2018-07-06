'use strict';

const util = require('util');

const ty = require('elisp/types.js');
const translator = require('elisp/translator.js');

/* global registry of subroutines */
let subroutines = {};

function define_subr(name, args, func, doc) {
  /* `func` : has the environment as `this` */
  /* TODO: make documentation database external */
  let subr = new ty.LispSubr(name, args, func, doc);
  subroutines[name] = subr;
};


/*
 *  introspection
 */
define_subr('jsrepr', [], function(expr) {
  return ty.string(util.inspect(expr));
});

define_subr('jscode', [],
function(expr) {
  let jscode = translator.translate(expr);
  return ty.string(jscode);
});

define_subr('jseval', [],
function(expr) {
  return eval(expr.to_js());
});

/*
 *  integer operations
 */
define_subr('+', [0, 0, 1],
function() {
  let sum = Array.prototype.reduce.call(arguments, (acc, e) => acc + e.to_js(), 0);
  return ty.integer(sum);
});

define_subr('*', [],
function() {
  return Array.prototype.reduce.call(arguments, (acc, e) => acc * e.to_js(), 1);
});

/*
 *  environment
 */
define_subr('fset', [ty.is_symbol, true],
function(sym, val) {
  return this.fset(sym.to_string(), val);
});

define_subr('symbol-function', [ty.is_symbol],
function(sym) {
  return this.fget(sym.to_string());
});

/*
 *  Errors
 */
define_subr('error', [ty.is_symbol, ty.is_string],
function(tag, message) {
  throw new ty.LispError(message.to_js());
});

/*
 *  Exports
 */
exports.all = subroutines;
