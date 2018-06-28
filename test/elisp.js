'use strict';

const assert = require('assert');

const ty = require('elisp/types');
const elisp = require('elisp/elisp');

const Environment = require('elisp/environment').Environment;


describe('translator', () => {
  const translate = require('elisp/translator').translate;

  describe('atom', () => {
    it("translates strings",    () => assert.equal(translate(ty.string("hello")), '"hello"'));
    it("translates numbers",    () => assert.equal(translate(ty.integer(42)), "42"));
    it("translates nil",        () => assert.equal(translate(ty.nil), "ty.nil"));
    it("translates symbols",    () => assert.equal(translate(ty.symbol("foo")), "env.get('foo')"));
  });
});


describe('special forms', () => {
  let env = new Environment();

  let assertEval = (input, output) => {
    let result = elisp.eval_text(input, env);
    assert.equal(result, output);
  };

  describe('quote', () => {
    it("should quote!",         () => assertEval("'foo", "foo"));
    it("should quote quote!",   () => assertEval("''foo", "(quote foo)"));

    it("(quote) should fail",   () => assert.throws(() => elisp.eval_text('(quote)')));
  });

  describe('if', () => {
    it("should choose true",         () => assertEval("(if t 1 2)", 1));
    it("should choose false",        () => assertEval("(if nil 1 2)", 2));
    it("should take a form",         () => assertEval("(if (if t nil t) 1 2)", 2));
  });

  describe('setq', () => {
    let env = new Environment();

    it("(setq x 12)",
        () => assertEval("(progn (setq x 12) x)", 12));
    it("(setq one 1 two 2)",
        () => assertEval("(progn (setq one 1 two 2) (+ one two))", 3));
  });

  describe('progn', () => {
    let env = new Environment();
    it("should execute commands", () => {
      assertEval("(progn (setq x 1) (setq x (+ x 1)) (setq x (* x 2)) x)", 4);
    });
  });
});
