'use strict';

const assert = require('assert');

const ty = require('elisp/types.js');

describe('translator', () => {
  const translate = require('elisp/translator').translate;

  describe('atom', () => {
    it("translates strings",    () => assert.equal(translate(ty.string("hello")), '"hello"'));
    it("translates numbers",    () => assert.equal(translate(ty.integer(42)), "42"));
    xit("translates symbols",    () => assert.equal(translate(ty.symbol("foo")), "Symbol('foo')"));
  });
});
