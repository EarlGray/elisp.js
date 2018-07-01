'use strict';

const assert = require('assert');

function from_js(val) {
  if (val instanceof LispObject)
    return val;
  switch (typeof val) {
    case 'number': return new LispInteger(val);
    case 'string': return new LispString(val);
    case 'symbol': return new LispSymbol(val.toString().slice(7, -1));
    default: throw new Error('Failed to lispify: ' + val.toString());
  }
}


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
LispInteger.prototype.to_js = function() { return this.num; };
LispInteger.prototype.to_jsstring = function() { return 'ty.integer(' + this.num + ')'; };

LispInteger.prototype.equals = function(that) {
  return that && that.__proto__ == this.__proto__
    && this.num === that.num;
};

/*
 *  LispSymbol
 */
function LispSymbol(sym) {
  this.sym = sym;
};
LispSymbol.prototype = Object.create(LispObject.prototype);

LispSymbol.prototype.to_string = function() { return this.sym; };
LispSymbol.prototype.to_js = function() { return Symbol(this.sym); };
LispSymbol.prototype.to_jsstring = function() { return "ty.symbol('" + this.sym + "')" };

Object.defineProperty(LispSymbol.prototype, 'is_symbol', { value: true, writable: false });

LispSymbol.prototype.equals = function(that) {
  return that && that.__proto__ == this.__proto__
    && that.sym === this.sym;
};

LispSymbol.prototype.is_selfevaluating = function() {
  return this.sym === 't' || this.sym.startsWith(':');
};

/*
 *  LispCons, LispNil
 */

function NilClass() {};
NilClass.prototype = Object.create(LispObject.prototype);

NilClass.prototype.toString = function() { return "[Object LispNil]"; };

NilClass.prototype.to_string = () => "nil";
NilClass.prototype.to_js = () => LispNil;
NilClass.prototype.to_jsstring = () => "ty.nil";

// you can be everything you want to be:
Object.defineProperty(NilClass.prototype, 'is_symbol', { value: true, writable: false });

// ...even a sequence!
NilClass.prototype.seqlen = () => 0;
Object.defineProperty(NilClass.prototype, 'is_seq', { value: true, writable: false });
Object.defineProperty(NilClass.prototype, 'is_list', { value: true, writable: false });

// ...even a nobody!
Object.defineProperty(NilClass.prototype, 'is_false', { value: true, writable: false });

const LispNil = new NilClass();
NilClass.prototype.equals = (that) => that == LispNil;



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

LispCons.prototype.forEach = function(callback) {
  let cur = this;
  while (cur != LispNil) {
    callback(cur.hd);
    if (!cur.tl.is_list)
      throw new Error('LispCons.forEach: not a regular list');
    cur = cur.tl;
  }
};

LispCons.prototype.show_elems = function() {
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
  return elems;
};

LispCons.prototype.to_string = function() {
  return '(' + this.show_elems().join(' ') + ')';
};
LispCons.prototype.to_js = function() {
  return '[' + this.show_elems().join(', ') + ']';
};
LispCons.prototype.to_jsstring = function() {
  let elems = [];
  this.forEach((item) => {
    let repr = item.to_jsstring();
    elems.push(repr);
  });
  return "ty.list([" + elems.join(', ') + '])';
};

LispCons.prototype.seqlen = function() {
  let cur = this;
  let len = 0;
  this.forEach(() => ++len);
  return len;
};

LispCons.prototype.equals = function(that) {
  return that && that.__proto__ === this.__proto__
    && that.hd.equals(this.hd) && that.tl.equals(this.tl);
};

let consify = (elems) => {
  let cur = LispNil;
  while (elems.length) {
    let elem = elems.pop();
    cur = new LispCons(elem, cur);
  }
  return cur;
};

LispCons.prototype.to_array = function() {
  let val = [];
  this.forEach((item) => val.push(item));
  return val;
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

LispString.prototype.to_js = function() { return this.to_string(); };
LispString.prototype.to_jsstring = function() { return 'ty.string(' + this.to_string() + ')'; };

LispString.prototype.seqlen = function() {
  return this.str.length;
};

LispString.prototype.equals = function(that) {
  return that && that.__proto__ == this.__proto__
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

LispHashtable.prototype.to_js = () => this.hash;


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
LispVector.prototype.to_js = function() { return this.arr; };
LispVector.prototype.to_jsstring = function() {
  return 'ty.vector([' + this.arr.map((it) => it.to_jsstring()).join(', ') + '])';
};
LispVector.prototype.seqlen = function() {
  return this.arr.length;
};
LispVector.prototype.equals = function(that) {
  return that && that.__proto__ == this.__proto__
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
 *  lambda
 */
function LispLambda() {
};
LispLambda.prototype = Object.create(LispObject.prototype);

/*
 *  native subroutine
 */
function LispSubr(name, args, func, doc) {
  this.name = name;
  this.args = args;
  this.func = func;
  this.doc = doc;
};

LispSubr.prototype = Object.create(LispObject.prototype);

Object.defineProperty(LispSubr.prototype,
  'is_subr', { value: true, writable: false }
);

LispSubr.prototype.to_string = function() { return "#<subr " + this.name + ">"; }
LispSubr.prototype.to_js = function() { return this.func; }
LispSubr.prototype.to_jsstring = function () { return "subr.all['" + this.name + "']"; };

LispSubr.prototype.fcall = function() {
  // console.error('### fcall(' + Array.prototype.join.call(arguments, ', ') + ')');
  let func = this.func;
  let args = Array.prototype.map.call(arguments, from_js);
  let result = func.apply(func, args);
  return result;
};

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
exports.LispSubr = LispSubr;

exports.is_atom = (obj) => (obj == LispNil) || !obj.is_list;
exports.is_list = (obj) => obj.is_list;
exports.is_sequence = (obj) => obj.is_seq;
exports.is_array = (obj) => obj.is_array;

// Elisp->JS mapping is one-to-one:
exports.is_string = (obj) => obj.__proto__ == LispString.prototype;
exports.is_vector = (obj) => obj.__proto__ == LispVector.prototype;
// many JS object types may be a symbol:
exports.is_symbol = (obj) => obj.is_symbol;

exports.nil     = LispNil;
exports.integer = (n) => new LispInteger(n);
exports.symbol  = (s) => new LispSymbol(s);
exports.cons    = (h, t) => new LispCons(h, t);
exports.list    = (arr) => consify(arr);
exports.vector  = (arr) => new LispVector(arr);
exports.string  = (s) => new LispString(s);

exports.from_js = from_js;
