'use strict';

const assert = require('assert');

const ty = require('elisp/types.js');
let cons = ty.cons;
let nil = ty.nil;

describe('types', () => {

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
