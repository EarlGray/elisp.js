'use strict';

const assert = require('assert');

const ty = require('elisp/types');
const subr = require('elisp/subr');
const Environment = require('elisp/environment').Environment;
const eval_text = require('elisp/elisp').eval_text;

describe('subr', () => {
  describe('+', () => {
    it("+ is a subr",           () => assert.ok(subr.all['+'].is_subr));

    it("(+) == 0",              () => assert.equal(eval_text('(+)'), 0));
    it("(+ 2 2) == 4",          () => assert.equal(eval_text('(+ 2 2)'), 4));
    it("(+ 1 2 3 4) == 10",     () => assert.equal(eval_text('(+ 1 2 3 4)'), 10));

    it("(+ 'one 'one) fails",   () => assert.throws(() => eval_text("(+ 'two 'two)")));
  });

  describe('car/cdr', () => {
    it("(car nil) == nil",      () => assert.equal(eval_text("(car nil)"), "nil"));
    it("(car '(1 2)) == 1",     () => assert.equal(eval_text("(car '(1 2))"), 1));
    it("(cdr nil) == nil",      () => assert.equal(eval_text("(cdr nil)"), "nil"));
    it("(cdr '(1 2)) == 1",     () => assert.equal(eval_text("(cdr '(1 2))"), "(2)"));
  });
});
