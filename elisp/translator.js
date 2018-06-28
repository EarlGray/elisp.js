'use strict';

const ty = require('elisp/types');
const env = require('elisp/environment');
const Environment = env.Environment;

let specials = {
  'quote': function(args) {
    if (args.is_false || !args.tl.is_false)
      throw new Error('Wrong number of arguments: quote, ' + args.seqlen());

    let what = args.hd;
    return what.to_jsstring();
  },

  'if': function(args, env) {
    args = args.to_array();
    if (args.length != 3)
      throw new Error('Wrong number of arguments: if, ' + args.length);

    let cond = translate_top(args[0], env);
    let thenb = translate_top(args[1], env);
    let elseb = translate_top(args[2], env);

    return '(!(' + cond + ').is_false ? (' + thenb + ') : (' + elseb + '))';
  },

  'setq': function(args, env) {
    args = args.to_array();
    if (args.length % 2)
      throw new Error('Wrong number of arguments: setq' + args.length);

    let pairs = [];
    let i = 0;
    while (i < args.length) {
      let name = args[i];
      let value = args[i+1];
      if (!ty.is_symbol(name))
        throw new Error('Wrong type argument: symbolp, ' + name.to_string());
      pairs.push("'" + name.to_string() + "'");
      pairs.push(translate_top(value, env));
      i += 2;
    }
    return "env.set(" + pairs.join(", ") + ")";
  },

  'progn': function(args, env) {
    if (args.is_false)
      return ty.nil.to_jsstring();
    args = args.to_array();
    let last = args.pop();

    let stmts = [];
    args.forEach((arg) => {
      stmts.push(translate_top(arg, env));
    });
    stmts.push('return ' + translate_top(last, env) + ';\n');

    return '(() => { ' + stmts.join(';\n') + '})()';
  },
};

let translate_expr = (input, env) => {
}

let translate_top = (input, env) => {
  if (input.is_false) {
    return "ty.nil";
  }
  if (ty.is_list(input)) {
    let hd = input.hd;
    if (ty.is_symbol(hd)) {
      let args = input.tl;
      let sym = hd.to_string();

      if (sym in specials)
        return (specials[sym])(args, env);

      let jsargs = [];
      args.forEach && args.forEach((item) => {
        let val = translate_top(item, env);
        jsargs.push(val);
      });
      return "env.fget('" + sym + "').fcall(" + jsargs.join(', ') + ")";
    }
  }

  if (ty.is_symbol(input)) {
    if (input.is_selfevaluating())
      return "Symbol('" + input.to_string() + "')";
    return "env.get('" + input.to_string() + "')";
  }
  if (ty.is_atom(input)) {
    return input.to_jsstring();
  }
  throw new Error('Failed to translate: ' + input.to_string());
};

exports.translate = (input) => translate_top(input, new Environment());
