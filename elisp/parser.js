'use strict';

let ty = require('elisp/types.js');
let P = require('parsimmon');

/*
 * Utils
 */
let mustEscape = "#;()[] \t\n\r\\\"'?";

let hexdigit = P.regex(/[0-9A-Fa-f]/);
let octdigit = P.regex(/[0-7]/);

let uniCharP = P.string('\\u').then(hexdigit.times(4))
  .or(P.string('\\U00').then(hexdigit.times(6)))
  .or(P.string('\\x').then(hexdigit.many()))
  .map((ds) => parseInt(ds.join(''), 16));
let octCharP = P.string('\\').then(octdigit.times(3))
  .map((os) => parseInt(os.join(''), 8));

let wordstop = P.oneOf(mustEscape).or(P.eof)

/*
 *  Lisp
 */
let Lisp = P.createLanguage({
  Integer: () => {
    return P.regexp(/[+-]?[0-9]+/)
      .lookahead(wordstop)     // otherwise it's a symbol
      .map((x) => ty.integer(parseInt(x)))
      .desc("number");
  },

  Character: () => {
    const escs = {
      a: 7, b: 8, t: 9, n: 10, v: 11, f: 12,
      r: 13, e: 27, s: 32, '\\': 92, d: 127
    };
    let escsKeys = Object.keys(escs).join('');

    let escCharP = P.string('\\').then(P.any)
      .map((c) => c in escs ? escs[c] : c.charCodeAt(0));
    let ctrlCharP = P.string('\\^').or(P.string('\\C-')).then(P.any)
      .map((c) => /[a-z]/i.test(c)
                  ? c.toUpperCase().charCodeAt(0)-64
                  : (1<<26)+c.charCodeAt(0)
       );
    let justCharP = P.any
      .map((c) => c.charCodeAt(0));

    return P.string('?')
      .then(P.alt(uniCharP, octCharP, ctrlCharP, escCharP, justCharP))
      .map(ty.integer)
      .desc('character')
  },

  String: () => {
    let dquote = P.string('"');
    let ignored = P.string('\\').then(P.oneOf('\n ')).result('');
    let escapes = P.string('\\').then(P.oneOf('"\\'));
    let unichar = uniCharP.map((code) => String.fromCharCode(code));
    let octchar = octCharP.map((code) => String.fromCharCode(code));

    return P.alt(unichar, octchar, ignored, escapes, P.noneOf('"'))
      .many().wrap(dquote, dquote)
      .map((cs) => ty.string(cs.join('')))
      .desc("string");
  },

  Symbol: (r) => {
    let nilp = P.string('nil').lookahead(wordstop).result(ty.nil);

    let charp = P.noneOf(mustEscape).or(P.string('\\').then(P.any));
    let symp = charp.atLeast(1)
      .map((atom) => ty.symbol(atom.join('')));
    return nilp.or(symp)
      .desc("symbol");
  },

  Expression: (r) => {
    let quote = P.string("'").then(r.Expression)
      .map((obj) => ty.list([ty.symbol('quote'), obj]))
      .desc("quoted expression");
    // fast backtracking first:
    return P.alt(
      r.Character,
      r.String,
      quote,
      r.List,
      r.Integer,
      r.Symbol
    ).desc("expression");
  },

  List: (r) => {
    let open = P.string('(').then(P.optWhitespace);
    let close = P.optWhitespace.then(P.string(')'));
    return r.Expression.sepBy(P.whitespace)
      .wrap(open, close)
      .map(ty.list)
      .desc("list/pair");
  },

  Vector: (r) => {
    return r.Expression.sepBy(P.whitespace)
      .wrap(P.string('['), P.string(']'))
      .map(ty.vector)
      .desc("vector");
  }
});


let mkParser = (p) => { return (input) => { return p.tryParse(input); }; };

exports.parseInteger = mkParser(Lisp.Integer);
exports.parseCharacter = mkParser(Lisp.Character);
exports.parseSymbol = mkParser(Lisp.Symbol);
exports.parseString = mkParser(Lisp.String);
exports.parseExpr = mkParser(Lisp.Expression);
exports.parseList = mkParser(Lisp.List);
exports.parseVector = mkParser(Lisp.Vector);
