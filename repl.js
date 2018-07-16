const readline = require('readline');
const process = require('process');

const ty = require('./elisp/types');
const parser = require('./elisp/parser');
const translate = require('./elisp/translate');
const elisp = require('./elisp/elisp');

var env = new elisp.Environment();

/* put special forms in the env */
translate.special_forms.forEach((form) => {
  let dummy = ty.subr(form, [], function() {
    throw new Error("Congratulations! You've just called a dummy, which should never happen");
  });
  env.fset(form, dummy);
});

env.fset('load', ty.subr('load', [], function(args) {
}));

/*
 *  prelude
 */
let prelude = [
`(fset 'defmacro
  '(macro lambda (name args body)
      (list 'fset (list 'quote name) (list 'quote (list 'macro 'lambda args body)))))`,
`(fset 'defun
  '(macro lambda (name args body)
      (list 'fset (list 'quote name) (list 'lambda args body))))`,
`(fset 'defvar
  '(macro lambda (name val)
      (list 'setq name val)))`,
`(setq *jsdebug* nil)`,
];
prelude.forEach((stmt) => elisp.eval_text(stmt, env));


/*
 *  Arguments
 */

let argv = process.argv;
switch (argv[argv.length - 1]) {
  case '--help': 
    console.error('Elisp to JS translator');
    process.exit();
};

/*
 *  completer
 */
function completer(line) {
  let par = line.lastIndexOf('(');
  let gap = line.lastIndexOf(' ');
  let start = ((par > gap) ? par : gap ) + 1;

  let key = line.slice(start);
  if (key.length == 0)
    return [[], line];

  let hits = [];
  for (let name in ((par > gap ? env.fs : env.vs))) {
    if (name.startsWith(key))
      hits.push(name);
  }

  return [hits, key];
}

/*
 *  repl loop
 */
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'elisp> ',
  completer: completer
});

rl.prompt();

rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;

  try {
    let result = elisp.eval_text(line, env);
    console.log(result);
  } catch (e) {
    let jsdebug = env.has_jsdebug();
    if (e instanceof ty.LispError && !jsdebug)
      console.error(e.name + ': ' + e.message);
    else
      console.error(e.stack);
  };

  rl.prompt();
});
rl.on('close', () => {
  console.log('');
});
