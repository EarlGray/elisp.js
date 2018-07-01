'use strict';

const assert = require('assert');

const ty = require('elisp/types');
const elisp = require('elisp/elisp');

const Environment = require('elisp/environment').Environment;


let env = new Environment();

let assertEval = (input, output) => {
  let result = elisp.eval_text(input, env);
  assert.equal(result, output);
};
let assertThrows = (input) => {
  /* TODO : make it check error message */
  assert.throws(() => elisp.eval_test(input, env), Error);
};


describe('translator', () => {
  const translate = require('elisp/translator').translate;

  describe('atom', () => {
    it("translates strings",    () => assert.equal(translate(ty.string("hello")), '"hello"'));
    it("translates numbers",    () => assert.equal(translate(ty.integer(42)), "42"));
    it("translates nil",        () => assert.equal(translate(ty.nil), "ty.nil"));
    it("translates symbols",
        () => assert.equal(translate(ty.symbol("foo")), "global.env.get('foo')"));
    it("translates keyword symbols",
        () => assert.equal(translate(ty.symbol(":bar")), "ty.symbol(':bar')"));
  });
});

describe('environment', () => {
  describe('global variables', () => {
    it("should set it",     () => assertEval("(progn (setq x 42) x)", 42));
    it("should re-set it",  () => assertEval("(progn (setq x :ignore) (setq x 42) x)", 42));
  });

  xdescribe('local variables', () => {
    it("should shadow globals",
        () => assertEval("(progn (setq x 42) (let ((x :ignore)) x) x)", 42));

    //xit("functions can create locals", () => assertEval);
    //it("macros can create locals"), () => );
    //it("condition-case can create locals", () => );
  });

  describe('constant symbols', () => {
    it("cannot set nil",      () => assertThrows("(setq nil t)"));
    it("cannot set t",        () => assertThrows("(setq t nil)"));
    it("cannot set keywords", () => assertThrows("(setq :nope :yes)"));
  });

  describe('void variables', () => {
    it("should throw on a non-existent variable", () => assertThrows("no-such"));
  });
});

describe('special forms', () => {
  describe('quote', () => {
    it("should quote!",         () => assertEval("'foo", "foo"));
    it("should quote quote!",   () => assertEval("''foo", "(quote foo)"));

    it("(quote) should fail",   () => assertThrows("(quote)"));
  });

  describe('environment', () => {
    let env = new Environment();

    describe('setq', () => {
      it("(setq x 12)",
          () => assertEval("(progn (setq x 12) x)", 12));
      it("(setq one 1 two 2)",
          () => assertEval("(progn (setq one 1 two 2) (+ one two))", 3));
    });

    xdescribe('let', () => {
      it("should make a binding",
          () => assertEval("(let ((x 12)) x)", 12));
      it("should make a nil binding",
          () => assertEval("(let (false) false)", ty.nil));
      it("should make two bindings",
          () => assertEval("(let ((x 12) (y 15)) (+ x y))", 27));
      it("should make a nested let",
          () => assertEval("(let ((x 12)) (let ((y 15)) (+ x y)))", 27));
      it("should make a nested let with shadowing",
          () => assertEval("(let ((x :ignore)) (let ((x 42)) x)))", 42));
      it("nested let should keep outer values",
          () => assertEval("(let ((x 42)) (progn (let ((x :ignore)) x) x))", 42));

      it("(let () 'ok)",        () => assertEval("(let () 'ok)", "ok"));
      it("(let [] 'ok)",        () => assertEval("(let [] 'ok)", "ok"));
      it("should set (let ((it)) it) to nil", () => assertEval("(let ((it)) it)", ty.nil));
      it("should return nil for empty body",  () => assertEval("(let ((it 'pass)))", ty.nil));

      it("should not see its own bindings",
          () => assertThrows("(let ((x 1) (y x)) y)", "Symbol's value as variable is void: x"));
      it("let* should see its own bindings",
          () => assertEval("(let* ((x 42) (y x)) y)", 42));

      it("should fail if bindings are not a sequence",
          () => assertThrows("(let it 'fail)", "Wrong type argument: sequencep, 63"));
      it("should reject ((x 1 2))",
          () => assertThrows("(let ((x 1 2)) x)",
            "'let' bindings can have only one value-form: x, 1, 2"));
      it("should reject (:notsettable 42)",
          () => assertThrows("(let ((:constant 42)) :constant)",
            "Attempt to set a constant symbol: :constant"));
      it("should reject ('wrongtype 42)",
          () => assertThrows("(let (('wrong-type 42)) 'wrong-type)",
            "Wrong type argument: symbolp, (quote wrong-type)"));
    });
  });

  describe('control flow', () => {
    describe('if', () => {
      it("should choose true",         () => assertEval("(if t 1 2)", 1));
      it("should choose false",        () => assertEval("(if nil 1 2)", 2));
      it("should choose true if any",  () => assertEval("(if :true 1 2)", 1));
      it("should take a form",         () => assertEval("(if (if t nil t) 1 2)", 2));
    });

    describe('progn', () => {
      let env = new Environment();
      it("should execute commands", () => {
        assertEval("(progn (setq x 1) (setq x (+ x 1)) (setq x (* x 2)) x)", 4);
      });
    });
  });
});
