const readline = require('readline');
const process = require('process');

const parser = require('elisp/parser');
var translate = require('elisp/translator').translate;

/*
 *  Arguments
 */
let replRawParser = (line) => parser.parseExpr(line);
let replParser = (line) => parser.parseExpr(line).to_string();
let replTranslator = (line) => {
  let expr = parser.parseExpr(line);
  let jscode = translate(expr);
  return jscode;
};
let replEvaluator = (line) => {
  let expr = parser.parseExpr(line);
  let jscode = translate(expr);
  let result = eval(jscode);
  return result;
};

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
    console.error('Syntax ' + e);
  };

  rl.prompt();
});
