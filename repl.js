const readline = require('readline');
const process = require('process');

const ty = require('elisp/types');
const parser = require('elisp/parser');
const translate = require('elisp/translate');

const Environment = require('elisp/environment').Environment;
var env = new Environment();

const elisp = require('elisp/elisp');


let replRawParser = (line) => parser.parseExpr(line);
let replParser = (line) => parser.parseExpr(line).to_string();
let replTranslator = (line) => {
  let expr = parser.parseExpr(line);
  let jscode = translate.expr(expr);
  return jscode;
};
let replEvaluator = (line) => elisp.eval_text(line, env);

/*
 *  Arguments
 */

/* default action */
var loop = replEvaluator;

let argv = process.argv;
switch (argv[argv.length - 1]) {
  case '--raw': loop = replRawParser; break;
  case '--parse': loop = replParser; break;
  case '--js': loop = replTranslator; break;
  case '--help': 
    console.error('[wannabe] Elisp to JS translator');
    console.error('Usage:');
    console.error(`  ${argv[1]} --parse\t: parse Elisp and print AST`);
    console.error(`  ${argv[1]} --js\t: see generated JS code`);
    console.error(`  ${argv[1]} --eval\t: [default] evaluate Elisp`);
    process.exit();
};

/*
 *  repl loop
 */
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'elisp> '
});

rl.prompt();

rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  if (line === 'q')
    return rl.close();

  try {
    console.log(loop(line));
  } catch (e) {
    let jsdebug = env.has_jsdebug();
    if (e instanceof ty.LispError && jsdebug)
      console.error(e.name + ': ' + e.message);
    else
      console.error(e.stack);
  };

  rl.prompt();
});
