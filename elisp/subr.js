'use strict';

const util = require('util');

const ty = require('./types');
const translate = require('./translate');
var elisp;

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
  let subr = ty.subr(name, args, func);
  subroutines_registry[name] = subr;
};

/*
 *  types
 */
define_subr('subrp', [[ty.any]], function(args) {
  return ty.bool(ty.is_subr(args[0]));
});

define_subr('functionp', [[ty.any]], function(args) {
  return ty.bool(ty.is_function(args[0]));
});
define_subr('macrop', [[ty.any]], function(args) {
  return ty.bool(ty.is_macro(args[0]));
});

define_subr('listp', [[ty.any]], function(args) {
  return ty.bool(ty.is_list(args[0]));
});
define_subr('numberp', [[ty.any]], function(args) {
  return ty.bool(ty.is_number(args[0]));
});

// subset of symbolp
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

define_subr('read', [[ty.string]], function(args) {
  elisp = elisp || require('./elisp');
  let input = args[0].to_js();
  return ty.list(elisp.readtop(input));
});

define_subr('eval', [[ty.any]], function(args) {
  elisp = elisp || require('./elisp');
  return elisp.eval_lisp(args[0]);
});

define_subr('macroexpand-1', [[ty.any]], function(args) {
  if (!ty.is_cons(args[0]))
    return args[0];
  let expr = args[0];
  let sym = expr.hd.sym;
  let f = this.fget(sym, true);
  return f.macroexpand(expr.tl, this);
});

/*
 *  integer operations
 */
define_subr('+', [[], [], ty.is_number], function(args) {
  if (args.length == 2)
    return ty.integer(args[0].to_js() + args[1].to_js());
  let sum = 0;
  for (let i = 0; i < args.length; ++i)
    sum += args[i].to_js();
  return ty.integer(sum);
});
define_subr('-', [[ty.is_number], [], ty.is_number], function(args) {
  let x = args[0].num;
  return ty.integer(args[1] ? x - args[1].num : -x);
});

define_subr('*', [[], [], ty.is_number], function(args) {
  if (args.length == 2)
    return ty.integer(args[0].to_js() * args[1].to_js());
  let prod = 1;
  for (let i = 0; i < args.length; ++i)
    prod *= args[i].to_js();
  return ty.integer(prod);
});

define_subr('<=', [[], [], ty.is_number], function(args) {
  if (args.length == 2)
    return ty.bool(args[0].to_js() <= args[1].to_js());
  for (let i = 1; i < args.length; ++i)
    if (args[i-1].to_js() > args[i].to_js())
      return ty.nil;
  return ty.t;
});

/*
 *  Lists
 */
define_subr('car', [[ty.is_list]], function(args) {
  return args[0].hd || ty.nil;
});
define_subr('cdr', [[ty.is_list]], function(args) {
  return args[0].tl || ty.nil;
});
define_subr('cons', [[ty.any, ty.any]], function(args) {
  return ty.cons(args[0], args[1]);
});
define_subr('list', [[], [], ty.any], function(args) {
  return ty.list(args);
});

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
  return this.fget(sym.to_string(), true);
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
