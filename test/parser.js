'use strict';

const assert = require('assert');

const parser = require('../elisp/parser.js');
const ty = require('../elisp/types.js');
let nil = ty.nil;
let cons = ty.cons;

describe('parser', () => {
  let quote = ty.symbol('quote');
  let foo = ty.symbol('foo');

  let one = ty.integer(1);
  let two = ty.integer(2);
  let list1 = cons(one, cons(two, nil));

  let parse = parser.parseExpr;
  let assertEquals = (lhs, rhs) => {
    if (!lhs.equals(rhs))
      assert.equal(lhs.to_js(), rhs.to_js());
  };

  describe('.parseInteger', () => {
    let assertIntp = (input, num) => {
      let val = parser.parseInteger(input);
      assert.equal(val.to_string(), num);
    };

    it("0",    () => assertIntp('0', 0));
    it("10",   () => assertIntp('10', 10));
    it("-1",   () => assertIntp('-1', -1));
    it("1.",   () => assertIntp('1.', 1));
    it("+42",  () => assertIntp('+42', 42));

    it("#x10", () => assertIntp('#x10', 16));
    it("#x-a", () => assertIntp('#x-a', -10));

    it("#b101100",  () => assertIntp('#b101100', 44));
    it("#o54",      () => assertIntp('#o54', 44));
    it("#x2c",      () => assertIntp('#x2c', 44));
    it("#24r1k",    () => assertIntp('#24r1k', 44));

    it("#x",    () => assert.equal(parser.read('#x'), ty.nil));
    it("#x.",   () => assert.equal(parser.read('#x.'), ty.nil));
    it("#x.1",  () => assert.equal(parser.read("#x.1"), ty.nil));
    it("#b-.",  () => assert.equal(parser.read('#b-.'), ty.nil));
  });

  xdescribe('.parseFloat', () => {
    let assertFloatP = (input, num) => {
      let val = parser.read(input);
      assert.equal(val.to_js(), num);
    };

    it("1500.0",      () => assertFloatP('1500.0', 1500.0));
    it("+15e2",       () => assertFloatP('15e2', 1500.0));
    it("15.0e+2",     () => assertFloatP('15.0+2', 1500.0));
    it("+1500000e-3", () => assertFloatP('+1500000e-3', 1500.0));
    it(".15e4",       () => assertFloatP('.15e4', 1500.0));
  });

  describe('.parseCharacter', () => {
    let assertCharp = (input, c) => {
      assert.equal(
        parser.parseCharacter(input).to_string(),
        (typeof c === 'string' ? c.charCodeAt(0) : c)
      );
    };

    it("should parse ?A",           () => assertCharp('?A', 'A'));
    it("should parse ?a",           () => assertCharp('?a', 'a'));
    it("should parse ?\\+",         () => assertCharp('?\\+', '+'));

    it("should parse ?\\a, C-g",    () => assertCharp('?\\a', 7));
    it("should parse ?\\t, <TAB>",  () => assertCharp('?\\t', 9));
    it("should parse ?\\s, <SPC>",  () => assertCharp('?\\s', ' '));
    it("should parse ?\\\\",        () => assertCharp('?\\\\', 92));
    it("should parse ?\\d, <DEL>",  () => assertCharp('?\\d', 127));

    it("should parse ?\\u0438, и",  () => assertCharp('?\\u1080', 4224));
    it("should parse ?\\U0001F4A9, U+{PILE OF POO}",
                                    () => assertCharp('?\\U0001F4A9', 128169));

    it("should parse ?\\x3A9, Ω",   () => assertCharp('?\\x3A9', 937));
    it("should parse ?\\101",       () => assertCharp('?\\101', 'A'));
    it("should parse ?\\^I",        () => assertCharp('?\\^I', 9));
    it("should parse ?\\C-I",       () => assertCharp('?\\C-I', 9));
    it("should parse ?\\C-ф",       () => assertCharp('?\\C-Ф', (1<<26)+'Ф'.charCodeAt(0)));

    xit("should parse ?\\M-A",       () => assertCharp('?\\M-A', 134217793));
    xit("should parse ?\\C-\\M-b",   () => assertCharp('?\\C-\\M-b', 134217730));
  });

  describe('.parseSymbol', () => {
    let assertSymp = (input, sym) => {
      sym = sym || input;
      let val = parser.parseExpr(input);
      assert.ok(val.is_symbol);
      assert.equal(val.to_string(), sym);
    };

    it("should parse 'foo",    () => assertSymp('foo'));
    it("should parse '1+",     () => assertSymp('1+'));
    it("should parse '\\+1",   () => assertSymp('\\+1', '+1'));
    it("should parse '+-*/_~!@$%^&=:<>{}", () => assertSymp('+-*/_~!@$%^&=:<>{}'));
    /* yes, these are valid symbols too: */
    it("should parse '\\(*\\ 1\\ 2\\)",  () => assertSymp('\\(*\\ 1\\ 2\\)', '(* 1 2)'));
    it("should parse '\\ \\ \\",    () => assertSymp('\\ \\ \\ ', '   '));
  });

  describe('.parseString', () => {
    let assertStr = (input, str) => {
      let val = parser.parseString(input);
      assert.equal(val.to_string(), str || input);
    };

    it('should parse ""',             () => assertStr('""'));
    it('should parse "hello world!"', () => assertStr('"hello world!"'));
    it('should parse "\\""',          () => assertStr('"\\""', '"\\""'));
    it('should parse "hello\nworld"', () => assertStr('"hello\nworld"'));
    it('should "ignore escaped\\\n newline"',
        () => assertStr('"escaped\\\n newline"', '"escaped newline"'));
    it('should "handle\\x20escapes"', () => assertStr('"\\x20"', '" "'));
    it('should "handle \\u044e"',     () => assertStr('"\\u044Enicode"', '"юnicode"'));
    it('should "handle \\x41\\ 42"',  () => assertStr('"\\x41\\ 42"', '"A42"'));
    xit('should render "\\C-a" as "^A"',  () => assertStr('"\\C-a"', "^A"));
  });

  describe('.parseQuote', () => {
    it("should parse quote",
        () => assertEquals(parse("'foo"), ty.list([quote, foo])));
    it("should parse double quote",
        () => assertEquals(parse("''foo"), ty.list([quote, ty.list([quote, foo])])));
    it("should parse quasiquote", () => {
      let lp = parse("`((+ 2 2) is ,(+ 2 2))");
      let l2p2 = ty.list([ty.symbol('+'), two, two]);
      let lc1 = ty.list([l2p2, ty.symbol('is'), ty.list([ty.symbol(','), l2p2])]);
      let lc = ty.list([ty.symbol('`'), lc1]);
      assertEquals(lp, lc);
    });
    it("`(list ,@splicing)", () => {
      let lp = parse("`(1 2 ,@rest)");
      let backtick = ty.symbol("`");
      let splice = ty.symbol(",@");
      let rest = ty.symbol('rest');
      let lc = ty.list([backtick, ty.list([one, two, ty.list([splice, rest])])]);
      assertEquals(lp, lc);
    });

    xit("#'(lambda (x) x)", () => {
      let x = ty.symbol('x');
      let lambda = ty.symbol('lambda');
      let fun = ty.list([lambda, ty.list([x]), x]);
      let funq = ty.list([ty.symbol('function'), fun]);
      assertEquals("#'(lambda (x) x)", funq);
    });
  });

  describe('.parseList', () => {
    it("should parse () as nil",
        () => assert.equal(parser.parseList("()"), nil));

    it("should parse (1 2)", () => {
      let lp = parser.parseList("(1 2)");
      assert(lp.equals(list1));
    });
    it("should handle optional whitespace", () => {
      let lp = parser.parseList("( 1  2 )");
      assert(lp.equals(list1));
    });
    it("should parse code", () => {
      let args = ty.list([ty.symbol('x')]);
      let idoc = ty.string("squared argument");
      let body = ty.list([ty.symbol('*'), ty.symbol('x'), ty.symbol('x')]);
      let cc = ty.list([ty.symbol('lambda'), args, idoc, body]);

      let cp = parser.parseList('(lambda (x) "squared argument" (* x x))');
      assert(cp.equals(cc));
    });
  });

  describe('.parseVector', () => {
    let assertVec = (input, arr) => {
      let vp = parse(input);
      let vc = ty.vector(arr);
      assert.ok(vp.equals(vc));
    };

    it("should parse []",       () => assertVec('[]', []));
    it("should parse [foo 1]",
        () => assertVec("[foo 1]", [foo, one]));
    it("should parse [ foo 1]",
        () => assertVec("[ foo 1]", [foo, one]));
  });

  describe('.parseExpr', () => {
    it("should parse nil as nil", () => assertEquals(parse("nil"), nil));
  });

  describe('comment', () => {
    it("should trim _whitespace",
        () => assertEquals(parser.read(' foo'), foo));
    it("should trim whitespace_",
        () => assertEquals(parser.read('foo '), foo));
    it("should trim _whitespace_",
        () => assertEquals(parser.read(' foo '), foo));
    it("should trim comments", () => {
      let lp = parser.read("wtf  ;; whiskey tango foxtrot");
      assertEquals(lp, ty.symbol('wtf'));
    });
    it("should trim empty comments", () => {
      let input = `;
      foo`;
      assertEquals(parser.read(input), foo);
    });
    it("should trim comments before", () => {
      let input = `;; start
      foo`;
      assertEquals(parser.read(input), foo);
    });
    it("should trim comments inside lists", () => {
      let input = `(1 ;; comment
      2)`;
      assertEquals(parser.read(input), list1);
    });
    it("should trim many comments", () => {
      let input = `
      ;; THE SOFTWARE IS PROVIDED "AS IS",
       ;; WITHOUT WARRANTY OF ANY KIND, EXRESSED OR IMPLIED
      foo`;
      assertEquals(parser.read(input), foo);
    });
    it("should respect strings", () => {
      let input = `("1;" 2)`;
      assertEquals(parser.read(input), ty.list([ty.string('1;'), two]));
    });
  });
});
