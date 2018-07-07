'use strict';

const ty = require('elisp/types');
const parser = require('elisp/parser');
const translator = require('elisp/translator');

const Environment = require('elisp/environment').Environment;

function fcall(args, env) {
  /* `this` is LispFun, do not call otherwise */
  if (args.length != this.args.length)
    throw new ty.LispError('Wrong number of arguments: ' + this.to_string() + ', ' + args.length);
  args.forEach((val, i) => { this.bindings[i+i+1] = val; });

  this.jscode = this.jscode || translator.translate(this.body, env);
  this.func = this.func || eval(`(() => { return ${this.jscode} })`);

  try {
    env.push.apply(env, this.bindings);
    var result = this.func();
  } finally {
    env.pop.apply(env, this.args);
  }
  return result;
}

function eval_lisp(expr, env) {
  env = env || new Environment('env');

  let result;
  let saved_env = global[env.name];
  try {
    global[env.name] = env;
    let jscode = translator.translate(expr, env);
    result = eval(jscode);
  } finally {
    global[env.name] = saved_env;
  }

  return result;
}

function eval_text(input, env) {
  let expr = parser.read(input);
  let result = eval_lisp(expr, env);
  return result.to_string();
}

/*
 *  Exports
 */
exports.eval_text = eval_text;
exports.eval_lisp = eval_lisp;

exports.fcall = fcall;
exports.Environment = Environment;
