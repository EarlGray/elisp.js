'use strict';

const ty = require('elisp/types');

let translate = (input) => {
  if (ty.is_symbol(input)) {
    return `rt.lookup(${input.to_string()})`;
  }
  if (ty.is_atom(input)) {
    return input.to_js();
  }
};

exports.translate = translate;
