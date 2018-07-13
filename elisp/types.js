'use strict';

const assert = require('assert');

function from_js(val) {
  if (val instanceof LispObject)
    return val;
  switch (typeof val) {
    case 'number': return new LispInteger(val);
    case 'string': return new LispString(val);
    case 'symbol': return new LispSymbol(val.toString().slice(7, -1));
    case 'undefined': return LispNil;
    default: throw new LispError('Failed to lispify: ' + val.toString());
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
Object.defineProperty(LispInteger.prototype,
  'is_number', { value: true, writable: false }
);

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
NilClass.prototype.to_array = () => [];
NilClass.prototype.is_selfevaluating = () => true;

// you can be everything you want to be:
Object.defineProperty(NilClass.prototype, 'is_symbol', { value: true, writable: false });

// ...even a sequence!
NilClass.prototype.seqlen = () => 0;
NilClass.prototype.forEach = () => null;
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
  for (let cur = this; cur != LispNil; cur = cur.tl) {
    callback(cur.hd);
    if (!cur.tl.is_list)
      throw new LispError('LispCons.forEach: not a regular list');
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

LispString.prototype.to_js = function() { return this.str; };
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
Object.defineProperty(LispVector.prototype,
  'is_seq', { value: true, writable: false }
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

LispVector.prototype.forEach = function(callback) {
  this.arr.forEach((item) => callback(item));
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
function LispFun(args, body, interact, doc) {
  this.args = args;
  this.body = body;
  this.interact = interact;
  this.doc = doc;

  /* a template to fill */
  let bindings = [];
  for (let i = 0; i < args.length; ++i) {
    bindings.push(args[i]);
    bindings.push(LispNil);
  }
  this.bindings = bindings;
};
LispFun.prototype = Object.create(LispObject.prototype);

Object.defineProperty(LispFun.prototype,
  'is_function', { value: true, writable: false }
);

LispFun.prototype.to_js = function() { return this.func; };
LispFun.prototype.to_jsstring = function() { return this.jscode || '#<thunk>'; };

LispFun.prototype.to_string = function() {
  let argl = consify(this.args.map((arg) => new LispSymbol(arg)));
  let body = this.body;
  if (body.hd && (body.hd.to_string() === 'progn')) {
    body = body.tl;
  }
  let fun = consify([new LispSymbol('lambda'), argl, body]);
  return fun.to_string();
};

LispFun.prototype.fcall = function(args, env) {
  LispFun.fcall = LispFun.fcall || require('./elisp').fcall;
  return LispFun.fcall.call(this, args, env);
};

/*
 *  native subroutine
 */
function LispSubr(name, args, func, attrs, doc) {
  this.name = name;
  this.args = args;
  this.func = func;
  this.attrs = attrs;
  this.doc = doc;
};

LispSubr.prototype = Object.create(LispObject.prototype);

Object.defineProperty(LispSubr.prototype,
  'is_function', { value: true, writable: false }
);

LispSubr.prototype.to_string = function() { return "#<subr " + this.name + ">"; }
LispSubr.prototype.to_js = function() { return this.func; }
LispSubr.prototype.to_jsstring = function () { return "subr.all['" + this.name + "']"; };

LispSubr.prototype.fcall = function(args, env) {
  try {
    let result = this.func.call(env, args);
    return result;
  } catch (e) {
    if (e instanceof TypeError)
      throw new LispError('Wrong type argument: numberp');
    else
      throw e;
  }
};

/*
 *  macros
 */
function LispMacro(transform) {
  this.transform = transform;
};

LispMacro.prototype = Object.create(LispObject.prototype);


/*
 *  Errors
 */
function LispError() {
  let err = Error.apply(this, arguments);
  this.name = err.name = 'LispError';

  this.message = err.message;
  this.fileName = err.fileName;
  this.lineNumber = err.lineNumber;

  let stack = err.stack.split('\n');
  this.stack = stack.slice(0, 1).concat(stack.slice(2)).join('\n');
}

LispError.prototype = Object.create(Error.prototype);


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

exports.any = () => true;
exports.is_atom = (obj) => (obj == LispNil) || !obj.is_list;
exports.is_list = (obj) => obj.is_list;
exports.is_sequence = (obj) => obj.is_seq;
exports.is_array = (obj) => obj.is_array;

// Elisp->JS mapping is one-to-one:
exports.is_string = (obj) => obj.__proto__ == LispString.prototype;
exports.is_vector = (obj) => obj.__proto__ == LispVector.prototype;
exports.is_subr = (obj) => obj.__proto__ == LispSubr.prototype;
// many JS object types may be a symbol:
exports.is_symbol = (obj) => obj.is_symbol;
exports.is_function = (obj) => obj.is_function;
exports.is_number = (obj) => obj.is_number;

exports.nil     = LispNil;
exports.t       = new LispSymbol('t');
exports.integer = (n) => (typeof n === 'undefined') ? LispNil : new LispInteger(n);
exports.symbol  = (s) => new LispSymbol(s);
exports.list    = (arr) => consify(arr);
exports.vector  = (arr) => new LispVector(arr);
exports.string  = (s) => new LispString(s);
exports.lambda  = (argspec, body, interact, doc) => new LispFun(argspec, body, interact, doc);
exports.subr    = (name, argspec, jscode) => new LispSubr(name, argspec, eval(jscode));

exports.cons    = (h, t) => new LispCons(h, t);

exports.bool    = (b) => (b ? exports.t : exports.nil);
exports.from_js = from_js;

/* errors */
exports.LispError = LispError;
