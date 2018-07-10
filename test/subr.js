'use strict';

const assert = require('assert');

const ty = require('elisp/types');
const subr = require('elisp/subr');
const Environment = require('elisp/environment').Environment;
const eval_text = require('elisp/elisp').eval_text;

describe('subr', () => {
  let assertEval = (input, output) => {
    let result = eval_text(input);
    assert.equal(result, output);
  };
  let assertThrows = (input, message) => {
    assert.throws(() => eval_text(input), ty.LispError);
  };

  describe('+', () => {
    it("+ is a subr",           () => assert.ok(ty.is_subr(subr.all['+'])));

    it("(+) == 0",              () => assertEval('(+)', 0));
    it("(+ 2 2) == 4",          () => assertEval('(+ 2 2)', 4));
    it("(+ 17 25) == 42",       () => assertEval('(+ 17 25)', 42));
    it("(+ 1 2 3 4) == 10",     () => assertEval('(+ 1 2 3 4)', 10));

    it("(+ 'one 'one) fails",   () => assertThrows("(+ 'two 'two)"));
  });

  describe('car/cdr', () => {
    it("(car nil) == nil",      () => assertEval("(car nil)", "nil"));
    it("(car '(1 2)) == 1",     () => assertEval("(car '(1 2))", 1));
    it("(cdr nil) == nil",      () => assertEval("(cdr nil)", "nil"));
    it("(cdr '(1 2)) == 1",     () => assertEval("(cdr '(1 2))", "(2)"));
  });
});
