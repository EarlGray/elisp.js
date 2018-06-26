const assert = require('assert');

describe('types', () => {
  let ty = require('elisp/types.js');

  let cons = ty.cons;
  let nil = ty.nil;

  let zero = ty.integer(0);
  let one = ty.integer(1);
  let two = ty.integer(2);
  let three = ty.integer(3);

  let foo = ty.symbol('foo');
  let bar = ty.symbol('bar');

  let c1 = cons(foo, one);
  let c2 = cons(bar, two);
  let list1 = cons(one, cons(two, cons(three, nil)));

  let vec0 = ty.vector();
  let vec1 = ty.vector([one, two, three, foo, bar]);

  describe('integer', () => {
    it("should be an atom", () => assert.ok(ty.is_atom(zero)));
  });

  describe('symbol', () => {
    it("should be 'foo",     () => assert.equal(foo.to_string(), "foo"));
    it("nil should be symbol",  () => assert.ok(ty.is_symbol(nil)));
  });

  describe('nil', () => {
    it("prints nil",        () => assert.equal(nil.to_string(), "nil"));
    it("should be false",   () => assert.ok(nil.is_false));
    it("should be a list",  () => assert.ok(nil.is_list));
    it("should be an atom", () => assert.ok(ty.is_atom(nil)));
  });

  describe('cons', () => {
    it("should be a list",      () => assert.ok(c1.is_list));
    it("should not be an atom", () => assert.ok(!ty.is_atom(list1)));

    it("should print (foo . 1)",
       () => assert.equal(cons(foo, one).to_string(), "(foo . 1)"));
    it("should print (1 2 3)",  () => assert.equal(list1.to_string(), "(1 2 3)"));
    it("should print ((foo . 1) . (bar . 2))",
       () => assert.equal(cons(c1, c2).to_string(), "((foo . 1) bar . 2)"));

    it("consify",           () => {
      let lst123 = ty.list([ty.integer(1), ty.integer(2), ty.integer(3)]);
      assert.ok(lst123.equals(list1));
    });
  });

  describe('vector', () => {
    it("should be []",          () => assert.equal(vec0.to_string(), '[]'));
    it("should be [1 2 3 foo bar]",
       () => assert.equal(vec1.to_string(), '[1 2 3 foo bar]'));
  });

  describe('string', () => {
    it("should be string",      () => assert.ok(ty.is_string(ty.string("hello"))));
  });


  /*
   *  equality
   */
  describe('equality', () => {
    let assertEq = (lhs, rhs) => assert.ok( lhs.equals(rhs) );

    it('1 equals 1',          () => assertEq(ty.integer(1), ty.integer(1)));
    it("'foo equals 'foo",    () => assertEq(ty.symbol('foo'), ty.symbol('foo')));
    it('"hi" equals "hi"',    () => assertEq(ty.string('hi'), ty.string('hi')));
    it('[] equals []',        () => assertEq(ty.vector(), ty.vector()));
    it("'((1 . 2) foo) equals '((1 . 2) foo)", () => assertEq(
        cons(cons(ty.integer(1), ty.integer(2)), cons(ty.symbol('foo'), nil)),
        cons(cons(ty.integer(1), ty.integer(2)), cons(ty.symbol('foo'), nil)))
    );
    it("ty.list([1, 2, foo]) equals (1 2 foo)", () => {
      let lst1 = ty.list([ty.integer(1), ty.integer(2), ty.symbol('foo')]);
      let lst2 = cons(ty.integer(1), cons(ty.integer(2), cons(ty.symbol('foo'), nil)));
      assert.ok(lst1.equals(lst2));
    });
  });

  /*
   *  sequences
   */
  describe('sequences', () => {
    it("(arrayp '(1 2 3)) is false",    () => assert.ok(!ty.is_array(list1)));
  });

  describe('length', () => {
    it("(length nil) is 0",             () => assert.equal(nil.seqlen(), 0));
    it("(length '(1 2 3)) is 3",        () => assert.equal(list1.seqlen(), 3));
    it("(length [1 2 3 foo bar]) is 5", () => assert.equal(vec1.seqlen(), 5));
  });
});

describe('parser', () => {
  let ty = require('elisp/types.js');
  let parser = require('elisp/parser.js');

  let nil = ty.nil;
  let cons = ty.cons;

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

    it("should parse 0",    () => assertIntp('0', 0));
    it("should parse 10",   () => assertIntp('10', 10));
    it("should parse -1",   () => assertIntp('-1', -1));
    it("should parse +42",  () => assertIntp('+42', 42));
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
      str = str || input;
      let val = parser.parseString(input);
      assert.equal(val.to_string(), str);
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
    it("should parse code",     () => {
      let args = cons(ty.symbol('x'), nil);
      let idoc = ty.string("squared argument");
      let body = cons(ty.symbol('*'), ty.cons(ty.symbol('x'), cons(ty.symbol('x'), nil)));
      let cc = cons(ty.symbol('lambda'), cons(args, cons(idoc, cons(body, nil))));

      let cp = parser.parseList('(lambda (x) "squared argument" (* x x))');
      assert(cp.equals(cc));
    });
  });

  describe('.parseVector', () => {
    let assertVec = (input, arr) => {
      let vp = parser.parseVector(input);
      let vc = ty.vector(arr);
      assert.ok(vp.equals(vc));
    };

    it("should parse []",       () => assertVec('[]', []));
    it("should parse [one 1]",  () => assertVec('[one 1]', [ty.symbol('one'), ty.integer(1)]));
  });

  describe('.parseExpr', () => {
    it("should parse nil as nil", () => assertEquals(parse("nil"), nil));
  });
});
