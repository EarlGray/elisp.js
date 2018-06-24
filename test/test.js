const assert = require('assert');

describe('types', () => {
  let ty = require('elisp/types.js');

  let nil = ty.LispNil;
  let integer = (n) => new ty.LispInteger(n);
  let symbol = (s) => new ty.LispSymbol(s);
  let cons = (h, t) => new ty.LispCons(h, t);
  let vector = (arr) => new ty.LispVector(arr);
  let string = (s) => new ty.LispString(s);

  let zero = integer(0);
  let one = integer(1);
  let two = integer(2);
  let three = integer(3);

  let foo = symbol('foo');
  let bar = symbol('bar');

  let c1 = cons(foo, one);
  let c2 = cons(bar, two);
  let list1 = cons(one, cons(two, cons(three, nil)));

  let vec0 = new ty.LispVector();
  let vec1 = vector([one, two, three, foo, bar]);
 
  describe('integer', () => {
    it("should be an atom", () => assert.ok(ty.is_atom(zero)));
  });

  describe('nil', () => {
    it("prints nil",        () => assert.equal(nil.to_string(), "nil"));
    it("should be false",   () => assert.ok(nil.is_false));
    it("should be a list",  () => assert.ok(nil.is_list));
    it("should be an atom", () => assert.ok(ty.is_atom(nil)));
  });

  describe('symbol', () => {
    it("should be 'foo",     () => assert.equal(foo.to_string(), "foo"));
  });

  describe('cons', () => {
    it("should be a list",      () => assert.ok(c1.is_list));
    it("should not be an atom", () => assert.ok(!ty.is_atom(list1)));

    it("should print (foo . 1)", 
       () => assert.equal(cons(foo, one).to_string(), "(foo . 1)"));
    it("should print (1 2 3)",  () => assert.equal(list1.to_string(), "(1 2 3)"));
    it("should print ((foo . 1) . (bar . 2))",
       () => assert.equal(cons(c1, c2).to_string(), "((foo . 1) bar . 2)"));
  });

  describe('vector', () => {
    it("should be []",          () => assert.equal(vec0.to_string(), '[]'));
    it("should be [1 2 3 foo bar]",
       () => assert.equal(vec1.to_string(), '[1 2 3 foo bar]'));
  });


  /*
   *  equality
   */
  describe('equality', () => {
    it('1 equals 1',          () => assert.ok(integer(1).equals(integer(1))));
    it("'foo equals 'foo",    () => assert.ok(symbol('foo').equals(symbol('foo'))));
    it('[] equals []',        () => assert.ok(vector().equals(vector())));
    it('"hi" equals "hi"',    () => assert.ok(string('hi').equals(string('hi'))));
    it("'((1 . 2) foo) equals '((1 . 2) foo)", () => {
      let lst1 = cons(cons(integer(1), integer(2)), cons(symbol('foo'), nil)); 
      let lst2 = cons(cons(integer(1), integer(2)), cons(symbol('foo'), nil));
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

  let nil = ty.LispNil;
  let integer = (n) => new ty.LispInteger(n);
  let symbol = (s) => new ty.LispSymbol(s);
  let cons = (h, t) => new ty.LispCons(h, t);
  let vector = (arr) => new ty.LispVector(arr);
  let string = (s) => new ty.LispString(s);

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

  describe('.parseList', () => {
    it("should parse () as nil",
        () => assert.equal(parser.parseList("()"), nil));
    it("should parse (1 2)", () => {
      let lp = parser.parseList("(1 2)");
      let lc = cons(integer(1), cons(integer(2), nil));
      assert(lp.equals(lc));
    });
    it("should parse code",     () => {
      let args = cons(symbol('x'), nil);
      let idoc = string("squared argument");
      let body = cons(symbol('*'), cons(symbol('x'), cons(symbol('x'), nil)));
      let cc = cons(symbol('lambda'), cons(args, cons(idoc, cons(body, nil))));

      let cp = parser.parseList('(lambda (x) "squared argument" (* x x))');
      assert(cp.equals(cc));
    });
  });

  describe('.parseVector', () => {
    let assertVec = (input, arr) => {
      let vp = parser.parseVector(input);
      let vc = vector(arr);
      assert.ok(vp.equals(vc));
    };

    it("should parse []",       () => assertVec('[]', []));
    it("should parse [one 1]",  () => assertVec('[one 1]', [symbol('one'), integer(1)]));
  });
});
