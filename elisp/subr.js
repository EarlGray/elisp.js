'use strict';

const util = require('util');

const ty = require('elisp/types.js');
const translator = require('elisp/translator.js');

let subroutines_registry = {};

/*
 * `args` : argument validators:
 *    [] - any number of any arguments;
 *    [<mandatory] - list of mandatory validators,
 *      e.g `[[ty.symbol, ty.any]]` - two variables, the first is a symbol;
 *    [<mandatory>, <optional>] - list of mandatory and optional validators;
 *    [<mandatory>, <optional>, <rest>]
 *      e.g. `[[ty.string], [], ty.any]`: one mandatory and many rest variables;
 *      e.g. `[[], [], ty.is_number]`: 0 or more numbers;
 *    Validators can be custom: [[], [], (arg, num) => ...];
 */
/* `func` : has the environment as `this` */
function define_subr(name, args, func, doc) {
  /* TODO: make documentation database external */
  let subr = new ty.LispSubr(name, args, func, doc);
  subroutines_registry[name] = subr;
};


/*
 *  introspection
 */
define_subr('jsrepr', [[ty.any]], function(expr) {
  return ty.string(util.inspect(expr));
});

define_subr('jscode', [[ty.any]],
function(expr) {
  let jscode = translator.translate(expr);
  return ty.string(jscode);
});

define_subr('jseval', [[ty.any]],
function(expr) {
  return eval(expr.to_js());
});

/*
 *  integer operations
 */
define_subr('+', [[], [], ty.is_number],
function() {
  let sum = Array.prototype.reduce.call(arguments, (acc, e) => acc + e.to_js(), 0);
  return ty.integer(sum);
});

define_subr('*', [[], [], ty.is_number],
function() {
  return Array.prototype.reduce.call(arguments, (acc, e) => acc * e.to_js(), 1);
});

/*
 *  environment
 */
define_subr('fset', [[ty.is_symbol, ty.any]],
function(sym, val) {
  return this.fset(sym.to_string(), val);
});

define_subr('symbol-function', [[ty.is_symbol]],
function(sym) {
  return this.fget(sym.to_string());
});

/*
 *  Errors
 */
define_subr('error', [[ty.is_symbol, ty.is_string]],
function(tag, message) {
  throw new ty.LispError(message.to_js());
});

/*
 *  Exports
 */
exports.all = subroutines_registry;
