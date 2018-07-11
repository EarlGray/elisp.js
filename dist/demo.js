const elisp = require('../elisp/elisp');
const parser = require('../elisp/parser');
const ty = require('../elisp/types');

var stdin = document.querySelector('#code');
var stdout = document.querySelector('#output');
var stderr = document.querySelector('#error');

var env = new elisp.Environment();

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
    stdout.innerText = result.to_string();
    stderr.innerText = '';
    stdin.style['border-right'] = '0.5em solid green';
  } catch (e) {
    if (e instanceof ty.LispError) {
      stdout.innerText = '';
      stderr.innerText = e.message;
      stdin.style['border-right'] = '0.5em solid gray';
    } else {
      stdin.style['border-right'] = '0.5em solid red';
      console.error(e);
    }
  }
};
