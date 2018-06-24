'use strict';

const assert = require('assert');

/*
 *  LispObject
 */

function LispObject() {};

LispObject.prototype = {
  to_string: function() { return '#<object>'; },
  extend: function(clss) { clss.prototype = Object.create(this.prototype); }
};

/*
 *  LispInteger
 */

function LispInteger(num) {
  assert(typeof num === 'number');
  this.num = num;
};
LispInteger.prototype = Object.create(LispObject.prototype);

LispInteger.prototype.to_string = function() { return this.num; };

LispInteger.prototype.equals = function(that) {
  return that && that.prototype == this.prototype
    && this.num === that.num;
};

/*
 *  LispSymbol
 */
function LispSymbol(sym) {
  this.sym = sym;
};
LispSymbol.prototype = Object.create(LispSymbol.prototype);

LispSymbol.prototype.to_string = function() { return this.sym; };
Object.defineProperty(LispSymbol.prototype, 'is_symbol', { value: true, writable: false });

LispSymbol.prototype.equals = function(that) {
  return that && that.prototype == this.prototype
    && that.sym === this.sym;
};

/*
 *  LispCons, LispNil
 */

var LispNil = {};
LispNil.prototype = Object.create(LispObject.prototype);
LispNil.to_string = () => "nil";
LispNil.equals = (that) => that === LispNil;
LispNil.seqlen = () => 0;

Object.defineProperty(LispNil, 'is_list', { value: true, writable: false });
Object.defineProperty(LispNil, 'is_false', { value: true, writable: false });
Object.defineProperty(LispNil, 'is_seq', { value: true, writable: false });


function LispCons(hd, tl) {
  this.hd = hd;
  this.tl = tl;
};

LispCons.prototype = Object.create(LispObject.prototype);
Object.defineProperty(LispCons.prototype,
  'is_list', { value: true, writable: false }
);
Object.defineProperty(LispCons.prototype,
  'is_seq', { value: true, writable: false }
);

LispCons.prototype.to_string = function() {
  let elems = [];
  let cur = this;
  while (cur != LispNil) {
    elems.push(cur.hd.to_string());
    if (!cur.tl.is_list) {
      elems.push('.');
      elems.push(cur.tl.to_string());
      break;
    }
    cur = cur.tl;
  };
  return '(' + elems.join(' ') + ')';
};

LispCons.prototype.seqlen = function() {
  let cur = this;
  let len = 0;
  while (cur != LispNil) {
    ++len;
    if (!cur.tl.is_list)
      break;
    cur = cur.tl;
  }
  return len;
};

LispCons.prototype.equals = function(that) {
  return that && that.prototype === this.prototype
    && that.hd.equals(this.hd) && that.tl.equals(this.tl);
};

/*
 *  string
 */
function LispString(str) {
  this.str = str;
};
LispString.prototype = Object.create(LispObject.prototype);
Object.defineProperty(LispString.prototype,
  'is_array', { value: true, writable: false }
);

LispString.prototype.to_string = function() {
  let str = this.str;
  str = str.replace(/\\/g, "\\\\");
  str = str.replace(/"/g, "\\\"");
  return '"' + str + '"';
};

LispString.prototype.seqlen = function() {
  return this.str.length;
};

LispString.prototype.equals = function(that) {
  return that && that.prototype == this.prototype
    && that.str === this.str;
};


/*
 *  hash-table
 */

function LispHashtable(hash) {
  this.hash = hash;
};
LispHashtable.prototype = Object.create(LispObject.prototype);

LispHashtable.prototype.to_string = function() {
  return "#s(<TODO>)";
};


/*
 *  vectors
 */
function LispVector(arr) {
  arr = arr || [];
  this.arr = arr;
};
LispVector.prototype = Object.create(LispObject.prototype);
Object.defineProperty(LispVector.prototype,
  'is_array', { value: true, writable: false }
);

LispVector.prototype.to_string = function() {
  return '[' + this.arr.map(obj => obj.to_string()).join(' ') + ']';
};
LispVector.prototype.seqlen = function() {
  return this.arr.length;
};
LispVector.prototype.equals = function(that) {
  return that && that.prototype == this.prototype
    && this.arr.length == that.arr.length
    && this.arr.every((v, i) => that.arr[i].equals(v));
};

/*
 *  char-table
 */
function LispChartable() { };
LispChartable.prototype = Object.create(LispObject.prototype);

/*
 *  bool-vector
 */
function LispBoolvector() { };
LispBoolvector.prototype = Object.create(LispObject.prototype);

/*
 *  exports
 */
exports.LispObject = LispObject;
exports.LispInteger = LispInteger;
exports.LispNil = LispNil;
exports.LispCons = LispCons;
exports.LispSymbol = LispSymbol;
exports.LispString = LispString;
exports.LispVector = LispVector;

exports.is_atom = (obj) => (obj == LispNil) || !obj.is_list;
exports.is_list = (obj) => obj.is_list;
exports.is_sequence = (obj) => obj.is_seq;
exports.is_array = (obj) => obj.is_array;

exports.is_string = (obj) => obj.prototype == LispString.prototype;
exports.is_symbol = (obj) => obj.prototype == LispSymbol.prototype;
exports.is_vector = (obj) => obj.prototype == LispVector.prototype;
