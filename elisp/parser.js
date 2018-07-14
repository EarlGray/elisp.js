'use strict';

let ty = require('./types.js');
let P = require('parsimmon');

/*
 * Utils
 */
let mustEscape = "#;()[] \t\n\r\\\"'`,?";

let hexdigit = P.regex(/[0-9A-Fa-f]/);
let octdigit = P.regex(/[0-7]/);

let uniCharP = P.string('\\u').then(hexdigit.times(4))
  .or(P.string('\\U00').then(hexdigit.times(6)))
  .or(P.string('\\x').then(hexdigit.many()))
  .map((ds) => parseInt(ds.join(''), 16));
let octCharP = P.string('\\').then(octdigit.times(3))
  .map((os) => parseInt(os.join(''), 8));

let wordstop = P.oneOf(mustEscape).or(P.eof);

let comment = P.string(';')
  .then(P.noneOf('\n').many())
  .then(P.end);
let gap = P.oneOf(" \t\r\n").or(comment);
let optWhitespace = gap.many();
let whitespace = gap.atLeast(1);

/*
 *  Lisp
 */
let Lisp = P.createLanguage({
  Integer: () => {
    let int = (s, b) => {
      let sign = '';
      if (s.length == 0)
        return; // ty.nil
      if (s[0].match(/[+-]/)) {
        sign = s[0];
        s = s.slice(1);
      }
      if (s.indexOf('.') == 0)
        return; // ty.nil
      return parseInt(sign + s, b);
    };
    let decP = P.regexp(/[+-]?[0-9]+\.?/)
      .map((s) => int(s, 10));
    let binP = P.regexp(/#b[+-]?[01]*(\.[01]*)?/)
      .map((s) => int(s.slice(2), 2));
    let octP = P.regexp(/#o[+-]?[0-7]*(\.[0-7]*)?/)
      .map((s) => int(s.slice(2), 8));
    let hexP = P.regexp(/#x[+-]?[0-9a-fA-F]*(\.[0-9a-fA-F]*)?/)
      .map((s) => int(s.slice(2), 16));
    let baseP = P.seqMap(
        P.regexp(/#[23]?[0-9]/),
        P.regexp(/r[+-]?[0-9a-zA-Z]*(\.[0-9a-zA-Z]*)?/),
        (b, s) => {
          let base = parseInt(b.slice(1), 10);
          if (!(2 <= base && base <= 36))
            throw new ty.LispError(
              "Invalid read syntax: integer, radix " + base
            );
          return int(s.slice(1), base);
        });

    return P.alt(binP, octP, hexP, baseP, decP)
      .lookahead(wordstop)     // otherwise it's a symbol
      .map((n) => ty.integer(n))
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
    let quotemap = {"'": "quote", "#'": "function"};
    let quote = P.seqMap(
        P.alt(P.string(",@"), P.string("#'"), P.oneOf("'`,")), r.Expression,
        (q, e) => ty.list([ty.symbol(quotemap[q] || q), e])
      ).desc("quoted expression");
    // fast backtracking first:
    return P.alt(
      r.Character,
      r.String,
      quote,
      r.List,
      r.Vector,
      r.Integer,
      r.Symbol
    ).wrap(optWhitespace, optWhitespace)
    .desc("expression");
  },

  List: (r) => {
    let open = P.string('(').then(optWhitespace);
    let close = optWhitespace.then(P.string(')'));
    return r.Expression.many()
      .wrap(open, close)
      .map(ty.list)
      .desc("list/pair");
  },

  Vector: (r) => {
    let open = P.string('[').then(optWhitespace);
    let close = optWhitespace.then(P.string(']'));
    return r.Expression.many()
      .wrap(open, close)
      .map(ty.vector)
      .desc("vector");
  }
});


let mkParser = (p) => (input) => p.tryParse(input);

exports.parseInteger = mkParser(Lisp.Integer);
exports.parseCharacter = mkParser(Lisp.Character);
exports.parseSymbol = mkParser(Lisp.Symbol);
exports.parseString = mkParser(Lisp.String);
exports.parseExpr = mkParser(Lisp.Expression);
exports.parseList = mkParser(Lisp.List);
exports.parseVector = mkParser(Lisp.Vector);

exports.read = (input) => Lisp.Expression.tryParse(input.trim());
exports.readtop = (input) => Lisp.Expression.many().tryParse(input);
