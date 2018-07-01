'use strict';

const util = require('util');

const ty = require('elisp/types.js');
const translator = require('elisp/translator.js');

let subroutines = {};

function define_subr(name, args, func, doc) {
  let subr = new ty.LispSubr(name, args, func, doc);
  subroutines[name] = subr;
};

define_subr('jscode', [],
function(expr) {
  let jscode = translator.translate(expr);
  return ty.string(jscode);
});

define_subr('jsrepr', [],
function(expr) {
  return ty.string(util.inspect(expr));
});

/*
 *
 */
define_subr('+', [0, 0, 1],
function() {
  let sum = Array.prototype.reduce.call(arguments, (acc, e) => acc + e.to_js(), 0);
  return ty.integer(sum);
},
`Return sum of any number of arguments, which are numbers or markers.

(fn &rest NUMBERS-OR-MARKERS)`
);

define_subr('*', [],
function() {
  return Array.prototype.reduce.call(arguments, (acc, e) => acc * e.to_js(), 1);
},
`Return product of any number of arguments, which are numbers or markers.

(fn &rest NUMBERS-OR-MARKERS)`);

/*
 *  Exports
 */
exports.all = subroutines;
