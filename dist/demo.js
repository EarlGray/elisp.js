const elisp = require('../elisp/elisp');
const parser = require('../elisp/parser');
const ty = require('../elisp/types');

var stdin = document.querySelector('#code');
var stdout = document.querySelector('#output');
var stderr = document.querySelector('#error');

var env = new elisp.Environment();

/* some Prelude */
let prelude = [
`(fset 'defmacro
  '(macro lambda (name args body)
      (list 'fset (list 'quote name) (list 'quote (list 'macro 'lambda args body)))))`,
`(fset 'defun
  '(macro lambda (name args body)
      (list 'fset (list 'quote name) (list 'lambda args body))))`
];
prelude.forEach((stmt) => elisp.eval_text(stmt, env));

stdin.oninput = function () {
  let code = stdin.value;
  if (code === '') {
    stdout.innerText = stderr.innerText = '';
    stdin.style['border-right'] = '0.5em solid gray';
    return;
  }

  let expr;
  try {
    expr = parser.read(code);
  } catch (e) {
    stdin.style['border-right'] = '0.5em solid red';
    return;
  };

  try {
    let result = elisp.eval_lisp(expr, env);
    stdin.style['border-right'] = '0.5em solid green';
    stderr.innerText = '';
    stdout.innerHTML = result.to_string();
  } catch (e) {
    if (e instanceof ty.LispError) {
      stdin.style['border-right'] = '0.5em solid gray';
      stdout.innerText = '';
      stderr.innerHTML = e.message;
    } else {
      stdin.style['border-right'] = '0.5em solid red';
      console.error(e);
    }
  }
};
