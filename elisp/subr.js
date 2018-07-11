'use strict';

const util = require('util');

const ty = require('./types.js');
const translate = require('./translate.js');

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
function define_subr(name, args, func, attrs, doc) {
  /* TODO: make documentation database external */
  let subr = new ty.LispSubr(name, args, func, attrs, doc);
  subroutines_registry[name] = subr;
};

/*
 *  types
 */
define_subr('subrp', [[ty.any]], function(args) {
  let expr = args[0];
  return ty.bool(ty.is_subr(expr));
});

define_subr('functionp', [[ty.any]], function(args) {
  let expr = args[0];
  return ty.bool(ty.is_function(expr));
});

define_subr('booleanp', [[ty.any]], function(args) {
  let expr = args[0];
  let val = ty.is_symbol(expr) && expr.to_string();
  return ty.bool(val == 't' || val == 'nil');
});

/*
 *  introspection
 */
define_subr('jsrepr', [[ty.any]], function(args) {
  return ty.string(util.inspect(args[0]));
});

define_subr('jscode', [[ty.any]],
function(args) {
  let arg = args[0];
  if (ty.is_function(arg)) {
    return ty.string(arg.to_jsstring());
  }
  let jscode = translate.expr(args[0], this);
  return ty.string(jscode);
},
{ need_env: true });

define_subr('jseval', [[ty.any]],
function(args) {
  return ty.from_js(eval(args[0].to_js()));
});

/*
 *  integer operations
 */
define_subr('+', [[], [], ty.is_number], function(args) {
  try {
    if (args.length == 2)
      return ty.integer(args[0].to_js() + args[1].to_js());
    let sum = Array.prototype.reduce.call(args, (acc, e) => acc + e.to_js(), 0);
    return ty.integer(sum);
  } catch (e) {
    if (e instanceof TypeError)
      throw new ty.LispError('Wrong type argument: numberp');
  }
});
define_subr('-', [[ty.is_number], [], ty.is_number], function(args) {
  let x = args[0].to_js();
  return ty.integer(args[1] ? x - args[1].to_js() : -x);
});

define_subr('*', [[], [], ty.is_number], function(args) {
  let prod = Array.prototype.reduce.call(args, (acc, e) => acc * e.to_js(), 1);
  return ty.integer(prod);
});

define_subr('<=', [[], [], ty.is_number], function(args) {
  for (let i = 1; i < args.length; ++i)
    if (args[i-1].to_js() > args[i].to_js())
      return ty.nil;
  return ty.t;
});

/*
 *  Lists
 */
define_subr('car', [[ty.is_list]], function(args) { return args[0].hd || ty.nil; });
define_subr('cdr', [[ty.is_list]], function(args) { return args[0].tl || ty.nil; });

/*
 *  environment
 */
define_subr('fset', [[ty.is_symbol, ty.any]],
function(args) {
  let [sym, val] = args;
  return this.fset(sym.to_string(), val);
},
{ need_env: true });

define_subr('symbol-function', [[ty.is_symbol]],
function(args) {
  let sym = args[0];
  return this.fget(sym.to_string());
},
{ need_env: true });

/*
 *  Errors
 */
define_subr('error', [[ty.is_symbol, ty.is_string]],
function(args) {
  let [tag, message] = args;
  throw new ty.LispError(message.to_js());
});

/*
 *  Utils
 */
define_subr('print', [[ty.any]], function(args) {
  let expr = args[0];
  console.log(expr.to_string());
  return expr;
});
define_subr('float-time', [[]], function() {
  return ty.integer(Date.now() / 1000);
});

/*
 *  Exports
 */
exports.all = subroutines_registry;
