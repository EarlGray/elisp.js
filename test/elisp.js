'use strict';

const assert = require('assert');

const ty = require('elisp/types');
const elisp = require('elisp/elisp');


let env = new elisp.Environment();

let assertEval = (input, output) => {
  let result = elisp.eval_text(input, env);
  assert.equal(result, output);
};
let assertThrows = (input) => {
  /* TODO : make it check error message */
  assert.throws(() => elisp.eval_text(input, env), ty.LispError);
};


describe('environment', () => {
  describe('global variables', () => {
    it("should set it",     () => assertEval("(progn (setq x 42) x)", 42));
    it("should re-set it",  () => assertEval("(progn (setq x :ignore) (setq x 42) x)", 42));
  });

 describe('local variables', () => {
    it("should shadow globals",
        () => assertEval("(progn (setq x 42) (let ((x :ignore)) x) x)", 42));

    //xit("functions can create locals", () => assertEval);
    //it("macros can create locals"), () => );
    //it("condition-case can create locals", () => );
  });

  describe('constant symbols', () => {
    it("cannot set nil",      () => assertThrows("(setq nil t)"));
    it("cannot set t",        () => assertThrows("(setq t nil)"));
    it("cannot set keywords", () => assertThrows("(setq :nope :yes)"));
  });

  describe('void variables', () => {
    it("should throw on a non-existent variable", () => assertThrows("no-such"));
  });

  describe('dynamic scope', () => {
    it("should use dynamic scope", () => {
      let code = `(progn
        (fset 'incx (lambda () (setq x (+ 1 x))))
        (let ((x 3)) (incx) x))
      `;
      assertEval(code, 4);
    });
  });
});

describe('types', () => {
  xdescribe('booleanp', () => {
    it("should recognize t", () => assertEval("(booleanp t)", "t"));
    it("should recognize nil", () => assertEval("(booleanp nil)", "t"));
    it("should not recognize anything else", () => assertEval("(booleanp 0)", "nil"));
  });

  xdescribe('subrp', () => {
    it("should accept subrs", () => assertEval("(subrp (symbol-function '+))", "t"));
    it("should reject functions", () => assertEval("(subrp (lambda (x) x))", "nil"));
  });
  xdescribe('functionp', () => {
    it("should accept functions", () => assertEval("(functionp (symbol-function '+))", "t"));
    it("should accept functions", () => assertEval("(functionp (lambda (x) x))", "t"));
    it("should reject others", () => {
      let code = `(progn
        (defmacro twice (fn x) \`(,f (,f ,x)))
        (functionp (symbol-function 'twice)))`;
      assertEval(code, "nil");
    });
  });
});


describe('special forms', () => {
  describe('quote', () => {
    it("should quote!",         () => assertEval("'foo", "foo"));
    it("should quote quote!",   () => assertEval("''foo", "(quote foo)"));

    it("(quote) should fail",   () => assertThrows("(quote)"));
  });

  describe('environment', () => {
    describe('setq', () => {
      it("(setq x 12)",
          () => assertEval("(progn (setq x 12) x)", 12));
      it("(setq one 1 two 2)",
          () => assertEval("(progn (setq one 1 two 2) (+ one two))", 3));
    });

    describe('let', () => {
      it("should make a binding",
          () => assertEval("(let ((x 12)) x)", 12));
      it("should make a nil binding",
          () => assertEval("(let (false) false)", "nil"));
      it("should make two bindings",
          () => assertEval("(let ((x 12) (y 15)) (+ x y))", 27));
      it("should make a nested let",
          () => assertEval("(let ((x 12)) (let ((y 15)) (+ x y)))", 27));
      it("should make a nested let with shadowing",
          () => assertEval("(let ((x :ignore)) (let ((x 42)) x))", 42));
      it("nested let should keep outer values",
          () => assertEval("(let ((x 42)) (progn (let ((x :ignore)) x) x))", 42));

      it("(let () 'ok)",        () => assertEval("(let () 'ok)", "ok"));
      it("(let [] 'ok)",        () => assertEval("(let [] 'ok)", "ok"));
      it("should set (let ((it)) it) to nil",
          () => assertEval("(let ((it)) it)", "nil"));
      it("should return nil for empty body",
          () => assertEval("(let ((it 'pass)))", "nil"));

      it("should not see its own bindings",
          () => assertThrows("(let ((a 1) (b a)) b)"));
      xit("let* should see its own bindings",
          () => assertEval("(let* ((x 42) (y x)) y)", 42));

      it("should fail if bindings are not a sequence",
          () => assertThrows("(let it 'fail)", "Wrong type argument: sequencep, 63"));
      it("should reject ((x 1 2))",
          () => assertThrows("(let ((x 1 2)) x)",
            "'let' bindings can have only one value-form: x, 1, 2"));
      it("should reject (:notsettable 42)",
          () => assertThrows("(let ((:constant 42)) :constant)",
            "Attempt to set a constant symbol: :constant"));
      it("should reject ('wrongtype 42)",
          () => assertThrows("(let (('wrong-type 42)) 'wrong-type)",
            "Wrong type argument: symbolp, (quote wrong-type)"));

      it("should take blocks",
          () => assertEval("(let () 'first 'second 'result)", "result"));
    });
  });

  describe('control flow', () => {
    describe('if', () => {
      it("should choose true",         () => assertEval("(if t 1 2)", 1));
      it("should choose false",        () => assertEval("(if nil 1 2)", 2));
      it("should choose true if any",  () => assertEval("(if :true 1 2)", 1));
      it("should take a form",         () => assertEval("(if (if t nil t) 1 2)", 2));
    });

    describe('progn', () => {
      it("should execute commands", () => {
        assertEval("(progn (setq x 1) (setq x (+ x 1)) (setq x (* x 2)) x)", 4);
      });
    });
  });
});


describe('functions', () => {
  describe('fset/symbol-function', () => {
    it("should set and get",
        () => assertEval("(progn (fset 'lol 'gotcha) (symbol-function 'lol))", "gotcha"));
  });

  describe('lambda', () => {
    it("should apply", () => assertEval("((lambda (x) (* x x)) 12)", 144));
    it("should create and apply function",
        () => assertEval("(progn (fset 'sqr (lambda (x) (* x x))) (sqr 12))", 144));
    it("((lambda ())) === nil",
        () => assertEval("((lambda ()))", "nil"));

    xit("((lambda . 1)) should be invalid",
        () => assertThrows("((lambda . 1))", "Wrong type argument: listp, 1"));
    xit("((lambda)) should be invalid",
        () => assertThrows("((lambda))", "Invalid function: (lambda)"));

    it("should check argument count (1 to 2)",
        () => assertThrows("((lambda (x y) x) 42)", "Wrong number of arguments: (lambda (x y) x), 1"));
    it("should check argument count (0 to 1)",
        () => assertThrows("((lambda (x) x))",
          "Wrong number of arguments: (lambda (x) x), 0"));
    it("should check argument count (1 to 0)",
        () => assertThrows("((lambda () 42) :dummy)",
          "Wrong number of arguments: (lambda nil 42), 1"));
  });

  describe('arguments', () => {
    it("should take no arguments", () => assertEval("((lambda ()))", "nil"));
    it("should take one argument", () => assertEval("((lambda (x) x) 42)", 42));
    it("should take two arguments", () => assertEval("((lambda (x y) (+ x y)) 2 2)", 4));

    it("should take symbols only",
        () => assertThrows("((lambda (1) 1) 1)", "Invalid function: (lambda (1) 1)"));
  });

  xdescribe('defun', () => {
    it("(defun sqr (x) (* x x))",
        () => assertEval("(progn (defun sqr (x) (* x x)) (let ((x 12)) (sqr x)))", 144));
  });

  xdescribe('funcall/apply', () => {
  });
  xdescribe('apply-partially', () => {
  });
});


xdescribe('macros', () => {
  it("fset's macro", () => {
    let _fset = "(fset 'twice '(macro lambda (fn arg) `(,fn (,fn ,arg))))";
    let _sqr =  "(fset 'sqr (lambda (x) (* x x)))";
    assertEval(`(progn ${_fset} ${_sqr} (twice sqr 2))`, 16);
  });
});
