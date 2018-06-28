'use strict';

const ty = require('elisp/types');
const parser = require('elisp/parser');
const translator = require('elisp/translator');
const Environment = require('elisp/environment').Environment;

function eval_lisp(expr, env) {
  env = env || new Environment();
  let jscode = translator.translate(expr, env);
  let result = eval(jscode);
  return ty.from_js(result);
}

function eval_text(input, env) {
  let expr = parser.read(input);
  let result = eval_lisp(expr, env);
  return result.to_string();
}

exports.eval_text = eval_text;
exports.eval_lisp = eval_lisp;
