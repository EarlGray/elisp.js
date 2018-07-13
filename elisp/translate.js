'use strict';

const ty = require('./types');
const Environment = require('./environment').Environment;

/*
 *  Static contexts:
 *  lexical variable scopes
 */
function Context(prev, bound) {
  this.prev = prev;

  this.vars = {};

  this.freefuns = {};
  this.freevars = {};
  this.bound = {};
  bound.forEach((v) => { this.bound[v] = true; });

  this.counter = prev ? prev.counter : 0;
  this.jsvars = {};

  this.is_fun = {};
}

Context.prototype.jsvar = function(name) {
  /* walks all contexts, returns the js variable for name or null */
  for (let ctx = this; ctx; ctx = ctx.prev) {
    if (name in ctx.vars)
      return ctx.vars[name];
  }
  return null;
}

Context.prototype.addvar = function(name, is_fun) {
  /* gets an existing js variable or creates new */
  let jsname;
  if (jsname = this.jsvar(name))
    return jsname;

  ++this.counter;
  jsname = (is_fun ? 'f' : 'v') + this.counter;

  /* if it's a free variable, save it */
  this.checkFree(name, is_fun);

  this.vars[name] = jsname;
  this.jsvars[jsname] = name;

  if (is_fun)
    this.is_fun[name] = true;
  return jsname;
}
Context.prototype.addfun = function(name) {
  return this.addvar(name, true);
}

Context.prototype.checkFree = function(name, is_fun) {
  /*
   * check if the name is bound;
   * otherwise save it as free in the outermost context
   */
  for (let ctx = this; ctx; ctx = ctx.prev) {
    if (name in ctx.bound)
      return false;
    if (!ctx.prev) {
      if (is_fun)
        ctx.freefuns[name] = true;
      else
        ctx.freevars[name] = true;
      return true;
    }
  }
}

Context.prototype.to_jsstring = function(env) {
  let jscode = [];
  for (let v in this.vars) {
    let jsvar = this.vars[v];
    let getter = this.is_fun[v] ? 'fun' : 'var_';
    jscode.push(`let ${jsvar} = ${env.to_jsstring()}.${getter}('${v}')`);
  }
  if (jscode.length)
    jscode = jscode.join(";\n") + ";\n";
  return jscode;
}


/*
 *    Translation
 */

function translate_get(name, env, ctx) {
  if (ctx) {
    let jsname = ctx.addvar(name);
    return `${jsname}.get()`;
  }
  return `${env.to_jsstring()}.get('${name}')`;
}

function translate_fget(name, env, ctx) {
  if (ctx) {
    let jsname = ctx.addfun(name);
    return `${jsname}.get()`;
  }
  return `${env.to_jsstring()}.fget('${name}')`;
}

function get_argspec(args) {
  let argspec = [];
  //console.error('### get_argspec: args = ' + args.to_string());
  args.forEach((arg) => {
    if (!ty.is_symbol(arg))
      throw new ty.LispError('Wrong type argument: symbolp, ' + arg.to_string());
    argspec.push(arg.to_string());
  });
  return argspec;
}

function translate_let(args, env, ctx) {
  /* sanity checks */
  if (args.is_false)
    throw new ty.LispError('Wrong number of arguments: let', 0);
  if (!ty.is_list(args))
    throw new ty.LispError('Wrong type argument: listp, ' + args.to_jsstring());

  let varlist = args.hd;
  let body = args.tl;
  if (!ty.is_list(body))
    throw new ty.LispError('Wrong type argument: listp, ' + body.to_jsstring());

  /* body preprocessing */
  if (body.is_false)
    body = ty.nil
  else if (body.tl.is_false)
    body = body.hd;
  else
    body = ty.cons(ty.symbol('progn'), body);

  if (!ty.is_sequence(varlist))
    throw new ty.LispError('Wrong type of argument: sequencep, 2');
  if (varlist.is_false)
    /* (let () <body>) */
    return translate_expr(body, env, ctx);

  let names = [];
  let values = [];
  let errors = [];
  varlist.forEach((binding) => {
    if (ty.is_symbol(binding)) {
      names.push(binding.to_string());
      values.push(ty.nil.to_jsstring());
    } else if (ty.is_list(binding)) {
      let name = binding.hd;
      binding = binding.tl;
      let jsval = translate_expr(binding.hd || ty.nil, env, ctx);
      binding = binding.tl;
      if (binding && !binding.is_false) {
        let msg = "'let' bindings can have only one value-form: " + name.to_string();
        errors.push(msg);
      } else if (!ty.is_symbol(name)) {
        errors.push("Wrong type argument: symbolp, " + name.to_string());
      } else if (name.is_selfevaluating()) {
        let msg = "Attempt to set a constant symbol: " + name.to_string();
        errors.push(msg);
      } else {
        names.push(name.to_string());
        values.push(jsval);
      }
    } else
      errors.push('Wrong type argument: listp, ' + binding.to_string());
  });

  if (errors.length) {
    return `(() => {
      throw new ty.LispError("${errors[0]}");
    })()`;
  }

  let bindings = [];
  for (let i = 0; i < names.length; ++i) {
    bindings.push("`" + names[i] + "`");
    bindings.push(values[i]);
  }
  bindings = bindings.join(', ');

  let ctx1 = new Context(ctx, names);
  let jscode = body ? translate_expr(body, env, ctx1) : ty.nil.to_jsstring();
  let jsctx = ctx1.to_jsstring(env);

  let jsenv = env.to_jsstring();
  let jsnames = names.map((n) => '`'+n+'`').join(', ');
  return `(() => {
    ${jsenv}.push(${bindings});
    ${jsctx} let result = ${jscode};
    ${jsenv}.pop(${jsnames});
    return result;
  })()`;
}

function translate_lambda(args, env) {
  let error = (msg, tag) => {
    return `ty.lambda([], ty.list([ty.symbol('error'), ty.string('${msg}')]))`
  };
  if (args.is_false)
    return error("Invalid function: (lambda)");
  if (!ty.is_list(args))
    return error('Wrong type argument: listp, 1');

  let repr = ty.cons(ty.symbol('lambda'), args);
  let body = args.tl || ty.nil;
  let argv = args.hd || ty.nil;
  if (!ty.is_list(argv))
    return error(`Invalid function: ${repr.to_string()}`);

  let argspec;
  try {
    argspec = get_argspec(argv);
  } catch (e) {
    return error(`Invalid function: ${repr.to_string()}`);
  }
  argspec = argspec.map((arg) => '`' + arg + '`');
  argspec = '[' + argspec.join(', ') + ']';

  if (body.is_false) {
    // do nothing, it must evaluate to nil
  } else if (body.tl.is_false) {
    // single form, extract
    body = body.hd;
  } else {
    // mutliple forms, prepend `progn`
    body = ty.cons(ty.symbol('progn'), body);
  }

  return `ty.lambda(${argspec}, ${body.to_jsstring()})`;
}

let specials = {
  'let': translate_let,
  'lambda': translate_lambda,

  'quote': function(args) {
    if (args.is_false || !args.tl.is_false)
      throw new ty.LispError('Wrong number of arguments: quote, ' + args.seqlen());

    let what = args.hd;
    return what.to_jsstring();
  },

  'setq': function(args, env, ctx) {
    args = args.to_array();
    if (args.length % 2)
      throw new ty.LispError('Wrong number of arguments: setq, ' + args.length);

    if (args.length == 2) {
      let [name, value] = args;
      if (!ty.is_symbol(name))
        throw new ty.LispError('Wrong type argument: symbolp, ' + name.to_string());
      if (name.is_selfevaluating())
        throw new ty.LispError('Attempt to set a constant symbol: ' + name.to_string());
      name = name.to_string();

      if (ctx) {
        let jsvar = ctx.addvar(name);
        let jsval = translate_expr(value, env, ctx);
        return `${jsvar}.set(${jsval})`;
      }
      let jsval = translate_expr(value, env, ctx);
      return `${env.to_jsstring()}.set('${name}', ${jsval})`;
    }

    let pairs = [];
    for (let i = 0; i < args.length; i += 2) {
      let name = args[i];
      let value = args[i+1];

      if (!ty.is_symbol(name))
        throw new ty.LispError('Wrong type argument: symbolp, ' + name.to_string());
      if (name.is_selfevaluating())
        throw new ty.LispError('Attempt to set a constant symbol: ' + name.to_string());
      name = name.to_string();

      if (ctx) ctx.checkFree(name);

      let jsval = translate_expr(value, env, ctx);

      pairs.push("'" + name + "'");
      pairs.push(jsval);
    }
    return env.to_jsstring() + ".set(" + pairs.join(", ") + ")";
  },

  'if': function(args, env, ctx) {
    args = args.to_array();
    if (args.length != 3)
      throw new ty.LispError('Wrong number of arguments: if, ' + args.length);

    let cond = translate_expr(args[0], env);
    let thenb = translate_expr(args[1], env);
    let elseb = translate_expr(args[2], env);

    return '(!(' + cond + ').is_false ? (' + thenb + ') : (' + elseb + '))';
  },

  'progn': function(args, env, ctx) {
    if (args.is_false)
      return ty.nil.to_jsstring();
    args = args.to_array();
    let last = args.pop();

    let stmts = [];
    args.forEach((arg) => {
      stmts.push(translate_expr(arg, env, ctx));
    });
    stmts.push('return ' + translate_expr(last, env, ctx) + ';\n');

    return '(() => { ' + stmts.join(';\n') + '})()';
  },

  'while': function(args, env, ctx) {
    if (args.is_false)
      throw new ty.LispError("Wrong number of arguments: while, 0");
    let condition = args.hd;
    let body = args.tl;

    condition = translate_expr(condition, env, ctx);
    if (body.is_false) {
      body = ''
    } else if (body.tl.is_false) {
      body = translate_expr(body.hd, env, ctx);
    } else {
      body = ty.cons(ty.symbol('progn'), body);
      body = translate_expr(body, env, ctx);
    }
    return `(() => {
      while (!${condition}.is_false) {
        ${body}
      };
      return ty.nil;
    })()`;
  },

};


function translate_expr(input, env, ctx) {
  if (input.is_false) {
    return ty.nil.to_jsstring();
  }
  if (ty.is_list(input)) {
    let hd = input.hd;
    let args = input.tl;

    let callable;
    if (ty.is_symbol(hd)) {
      let args = input.tl;
      let sym = hd.to_string();

      if (sym in specials)
        return (specials[sym])(args, env, ctx);

      callable = translate_fget(sym, env, ctx);
    } else if (ty.is_list(hd)) {
      callable = translate_expr(hd, env, ctx);
    } else {
      callable = `ty.subr('#<error>', [], (() => { throw new ty.LispError('Invalid function: ${hd.to_string()}'); }))`;
    }

    let jsenv = env.to_jsstring();
    let jsargs = [];
    args.forEach((item) => {
      let val = translate_expr(item, env, ctx);
      jsargs.push(val);
    });
    jsargs = '[' + jsargs.join(', ') + ']';

    return callable + `.fcall(${jsargs}, ${jsenv})`;
  }

  if (ty.is_symbol(input)) {
    if (input.is_selfevaluating())
      return input.to_jsstring();
    return translate_get(input.to_string(), env, ctx);
  }
  if (ty.is_atom(input)) {
    return input.to_jsstring();
  }
  throw new Error('Failed to translate: ' + input.to_string());
};

/*
 *    Exports
 */
exports.expr = (input, env) => {
  env = env || new Environment();
  return translate_expr(input, env);
};

exports.lambda = (args, body, env) => {
  let ctx = new Context(null, args);

  let jsbody = translate_expr(body, env, ctx);
  let jsctx = ctx.to_jsstring(env);

  /*
  let freevars = Object.keys(ctx.freevars);
  let freefuns = Object.keys(ctx.freefuns);
  console.error('### lambda: freefuns = ' + freefuns.join(','));
  console.error('### lambda: freevars = ' + freevars.join(','));
  */

  return `(() => { ${jsctx} return ${jsbody}; })`;
};