'use strict';

const ty = require('elisp/types');
const Environment = require('elisp/environment').Environment;

let specials = {
  'quote': function(args) {
    if (args.is_false || !args.tl.is_false)
      throw new Error('Wrong number of arguments: quote, ' + args.seqlen());

    let what = args.hd;
    return what.to_jsstring();
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
      if (name.is_selfevaluating())
        throw new Error('Attempt to set a constant symbol: ' + ty.to_string());
      pairs.push("'" + name.to_string() + "'");
      pairs.push(translate_top(value, env));
      i += 2;
    }
    return env.to_jsstring() + ".set(" + pairs.join(", ") + ")";
  },

  'let': function(args, env) {
    args = args.to_array();
    if (args.length < 1 || 2 < args.length)
      throw new Error('Wrong number of arguments: let', args.length);
    if (!ty.is_sequence(args[0]))
      throw new Error('Wrong type of argument: sequencep, 2');

    if (args[0].is_false)
      return translate_top(args[1] || ty.nil, env);

    let names = [];
    let values = [];
    let errors = [];
    args[0].forEach((binding) => {
      if (ty.is_symbol(binding)) {
        names.push(binding);
        values.push(ty.nil.to_jsstring());
      } else if (ty.is_list(binding)) {
        let name = binding.hd;
        binding = binding.tl;
        let jsval = translate_top(binding.hd || ty.nil, env);
        binding = binding.tl;
        if (binding && !binding.is_false) {
          let msg = "'let' bindings can have only one value-form: " + name.to_string();
          errors.push(msg);
        } else {
          names.push(name);
          values.push(jsval);
        }
      } else
        throw new Error('Wrong type argument: listp, ' + binding.to_string());
    });

    if (errors.length) {
      return `() => {
        throw new Error("${errors[0]}");
      })()`;
    }

    names = names.map((n) => "`" + n.to_string() + "`");
    let bindings = [];
    for (let i = 0; i < names.length; ++i) {
      bindings.push(names[i]);
      bindings.push(values[i]);
    }

    let jscode = ty.nil.to_jsstring();
    if (args[1]) {
      jscode = translate_top(args[1], env);
    }
    return `(() => {
      ${env.to_jsstring()}.push(${bindings.join(', ')});
      let result = ${jscode};
      ${env.to_jsstring()}.pop(${names.join(', ')});
      return result;
    })()`;
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

let translate_top = (input, env) => {
  if (input.is_false) {
    return ty.nil.to_jsstring();
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
      return env.to_jsstring() + ".fget('" + sym + "').fcall(" + jsargs.join(', ') + ")";
    }
  }

  if (ty.is_symbol(input)) {
    if (input.is_selfevaluating())
      return "ty.symbol('" + input.to_string() + "')";
    return env.to_jsstring() + ".get('" + input.to_string() + "')";
  }
  if (ty.is_atom(input)) {
    return input.to_jsstring();
  }
  throw new Error('Failed to translate: ' + input.to_string());
};

exports.translate = (input, env) => translate_top(input, env || new Environment());
