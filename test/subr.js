'use strict';

const assert = require('assert');

const ty = require('../elisp/types');
const subr = require('../elisp/subr');
const Environment = require('../elisp/environment').Environment;
const eval_text = require('../elisp/elisp').eval_text;

describe('subr', () => {
  let assertEval = (input, output) => {
    let result = eval_text(input);
    assert.equal(result, output);
  };
  let assertEvalT = (input) => assertEval(input, 't');
  let assertEvalF = (input) => assertEval(input, 'nil');
  let assertThrows = (input, message) => {
    assert.throws(() => eval_text(input), ty.LispError);
  };

  describe('types', () => {
    xit('(type-of "hello") is string',     () => assertEval('(type-of "hello")', 'string'));

    let type_predicates = [
      'booleanp', 'functionp', 'listp', 'numberp',  'subrp',
    ];
    type_predicates.forEach((typ) => {
      it(typ, () => assertEvalT(`(subrp (symbol-function '${typ}))`));
    });

    let type_predicates_todo = [
      'atom', 'arrayp', 'bool-vector-p', 'bufferp', 'byte-code-function-p', 'case-table-p', 'char-or-string-p', 'char-table-p', 'commandp', 'condition-variable-p', 'consp', 'custom-variable-p', 'floatp', 'fontp', 'frame-configuration-p', 'frame-live-p', 'framep', 'hash-table-p', 'integer-or-marker-p', 'integerp', 'keymapp', 'keywordp', 'markerp', 'mutexp', 'nlistp', 'number-or-marker-p', 'overlayp', 'processp', 'recordp', 'sequencep', 'string-or-null-p', 'stringp', 'syntax-table-p', 'threadp', 'vectorp', 'wholenump', 'window-configuration-p', 'window-live-p', 'windowp', 'symbolp', 'natnump',
    ];
    type_predicates_todo.forEach((typ) => {
      xit(typ, () => assertEvalT(`(subrp (symbol-function '${typ}))`));
    });
  });

  xdescribe('equality', () => {
    it("(eq 'foo 'foo)",      () => assertEvalT("(eq 'foo 'foo)"));
    it('(eq "asdf" "asdf")',  () => assertEvalF('(eq "asdf" "asdf")'));
    it("(eq '(1) '(1))",      () => assertEvalF("(eq '(1) '(1)"));
    it("(eq foo foo)",        () => assertEvalT("(let ((foo '(1 2))) (eq foo foo))"));
    it("(eq [1] [1])",        () => assertEvalF("(eq [1] [1])"));

    it("(equal 'foo 'foo)",     () => assertEvalT("(equal 'foo 'foo)"));
    it('(equal "asdf" "asdf")', () => assertEvalT('(equal "asdf" "asdf")'));
    it("(equal '(1) '(1))",     () => assertEvalT("(equal '(1) '(1)"));
    it("(equal [1] [1])",       () => assertEvalT("(equal [1] [1])"));

    xit("(equal-including-properties",
        () => assertEvalF(`(equal-including-properties "asdf" (propertize "asdf" 'asdf t))`));
  });

  /* numbers */
  describe('numbers', () => {
    xit("(zerop 0)", () => assertEvalT("(zerop 0)"));
    xit("(1+ 2)",    () => assertEval("(1+ 2)", 3));
    xit("(1- -3)",    () => assertEval("(1- -3)", -4));
    xit("most-positive-fixnum", () => assertEval("(numberp most-positive-fixnum)"));
    xit("most-negative-fixnum", () => assertEval("(numberp most-negative-fixnum)"));

    xdescribe('floating-point', () => {
      it("(isnan (/ 0.0 0.0))",     () => assertEvalT("(isnan (/ 0.0 0.0))"));
      it("(frexp 2.781)",           () => assertEval("(frexp 2.781)", "(0.69525 . 2)"));
      it("(ldexp 0.69525 2)",       () => assertEval("(ldexp 0.69525 2)", "2.781"));
      it("(copysign -42 1)",        () => assertEval("(copysign -42 1)", 42));
      it("(logb 10)",               () => assertEval("(logb 10)", 3));
    });
    describe('numperp', () => {
      it("(numberp 0)",       () => assertEvalT("(numberp 0)"));
      it("(numberp -1)",      () => assertEvalT("(numberp -1)"));
      it("(numberp #x10)",    () => assertEvalT("(numberp #x10)"));
      it("(numberp 'one)",    () => assertEvalF("(numberp 'one)"));
    });
    describe('+', () => {
      it("+ is a subr",           () => assert.ok(ty.is_subr(subr.all['+'])));
      it("(+) == 0",              () => assertEval('(+)', 0));
      it("(+ 2 2) == 4",          () => assertEval('(+ 2 2)', 4));
      it("(+ 17 25) == 42",       () => assertEval('(+ 17 25)', 42));
      it("(+ 1 2 3 4) == 10",     () => assertEval('(+ 1 2 3 4)', 10));

      xit("(+ 'one 'one) fails",   () => assertThrows("(+ 'two 'two)"));
    });
    describe('-', () => {
      it("(- 10) is -10",     () => assertEval("(- 10)", -10));
      xit("(-) is 0",          () => assertEval("(-)", 0));
      xit("(- 10 1 2 3 4)",    () => assertEval("(- 10 1 2 3 4)", 0));
      it("(- 2 -2) is 4",     () => assertEval("(- 2 -2)", 4));
    });
    describe('*', () => {
      it("(*)",         () => assertEval("(*)", 1));
      it("(* 1)",       () => assertEval("(* 1)", 1));
      it("(* 1 2 3 4)", () => assertEval("(* 1 2 3 4)", 24));
    });
    xdescribe('/', () => {
      it("(/ 6 2) is 3",    () => assertEval("(/ 6 2)", 3));
      it("(/ -17 6)",       () => assertEval("(/ -17 6)", -2));
      it("(/ 1 0) throws",  () => assertThrows("(/ 1 0)", "arith-error"));
    });
    xdescribe('%', () => {
      it("(% -9 4) is -1", () => assertEval("(% -9 4)", -1));
      it("(% 9 -4) is 1", () => assertEval("(% 9 -4)", 1));
      it("(% -9 -4) is -1", () => assertEval("(% -9 -4)", -1));
    });
    xdescribe('mod', () => {
      it("(mod -9 4) is 3", () => assertEval("(mod -9 4)", 3));
      it("(mod 9 -4) is -3", () => assertEval("(mod 9 -4)", -3));
      it("(mod -9 -4) is -1", () => assertEval("(mod -9 -4)", -1));
      it("(mod 5.5 2.5) is .5", () => assertEval("(mod 5.5 2.5)", 0.5));
    });
    xdescribe('floating-point rounding', () => {
      it("(ffloor -1.2) is -2.0",   () => assertEval("(ffloor -1.2)", -2.0));
      it("(fceiling -1.2) is -1.0",   () => assertEval("(fceiling -1.2)", -1.0));
      it("(ftruncate -1.2) is -1.0",   () => assertEval("(ftruncate -1.2)", -1.0));
      it("(fround -1.5) is -2.0",   () => assertEval("(fround -1.5)", -2.0));
      it("(fround -2.5) is -2.0",   () => assertEval("(fround -2.5)", -2.0));
    });
    xdescribe('bitwise operations', () => {
      it("lsh");
      it("ash");
      it("logand");
      it("logior");
      it("logxor");
      it("lognot");
    });
    xdescribe('number comparison', () => {
      it("(eql 1 1.0)",     () => assertEvalT("(eql 1 1.0)"));
      it("(/= 1 1.0)",      () => assertEvalF("(/= 1 1.0)"));
      it("(< 0 0)",         () => assertEvalF("(< 0 0)"));
      it("(<= 0 0.0)",      () => assertEvalT("(<= 0 0.0)"));
      it("(> -1 -2)",       () => assertEvalT("(> -1 -2)"));
      it("(>= -1 -1.0)",    () => assertEvalT("(>= -1 -1.0)"));
      it("(max 1 3 2)",     () => assertEval("(max 1 3 2)", 3));
      it("(min -1 -3 2)",   () => assertEval("(max -1 -3 2)", -3));
      it("(abs -42)",       () => assertEval("(abs -42)", 42));
    });
    xdescribe("number conversion", () => {
      it("(float 1) is 1.0",        () => assertEvalT("(floatp (float 1))"));
      it("(truncate -1.2) is -1",   () => assertEval("(truncate -1.2)", -1));
      it("(floor -1.7) is -2",      () => assertEval("(floor -1.7)", -2));
      it("(ceiling -1.7) is -1",    () => assertEval("(ceiling -1.7)", -1));

      it("(round -1.2) is -1",      () => assertEval("(round -1.2)", -1));
      it("(round -1.7) is -2",      () => assertEval("(round -1.7)", -2));
      it("(round -1.5) is -2",      () => assertEval("(round -1.5)", -2));
      it("(round -2.5) is -2",      () => assertEval("(round -2.5)", -2));
    });
    xdescribe('math', () => {
      it("(sin)");
      it("(cos)");
      it("(tan)");
      it("(asin)");
      it("(acos)");
      it("(atan)");
      it("(exp)");
      it("(log)");
      it("(expt)");
      it("(sqrt)");
      it("float-e");
      it("float-pi");
    });
    xdescribe('random numbers', () => {
      it("(numberp (random 100)", () => assertEvalT("(numberp (random 100)"));
    });
  });

  /* strings */
  describe('strings', () => {
    xit('(stringp "")',          () => assertEvalT('(stringp "")'));
    xit('(string-or-null-p "")', () => assertEvalT('(string-or-null-p "")'));
    xit('(char-or-string-p ?a)', () => assertEvalT('(char-or-string-p ?a)'));

    xit('(make-string 5 ?x) is "xxxxx"',   () => assertEval('(make-string 5 ?x)', '"xxxxx"'));
    xit('(string ?a ?b ?c) is "abc"',      () => assertEval('(string ?a ?b ?c)', '"abc"'));

    xit('(substring "abcdef" 3) is "def"',
        () => assertEval('(substring "abcdef" 3)', '"def"'));
    xit('(substring "abcdefgh" 3 6) is "def"',
        () => assertEval('(substring "abcdefgh" 3 6)', '"def"'));
    xit('(substring "abcdefg" -3 nil) is "efg"',
        () => assertEval('(substring "abcdefg" -3 nil)', '"efg"'));
    xit('(substring-no-properties)');

    xit('(concat "ab" "cd" "ef")',  () => assertEval('(concat "ab" "cd" "ef")', '"abcdef"'));
    xit('(split-string "  two words")',
        () => assertEval('(split-string "  two words")', '("two" "words")'));
    xit('(split-string "banana" "a")',
        () => assertEval('(split-string "banana" "a")', '("b" "n" "n" "")'));
    xit('(split-string "abc" "")',
        () => assertEval('(split-string "abc" "")', '("a" "b" "c")'));
    /* TODO: look up other cases in the manual */

    xit('(store-substring ?c)',
        () => assertEval('(let ((s "bar")) (store-substring s 2 ?z) s)', '"baz"'));
    xit('(store-substring "")',
        () => assertEval('(let ((s "footer")) (store-substring s 3 "ba") s)', '"foobar"'));
    xit('(store-substring "does not fit")',
        () => assertThrows('(let ((s "foot")) (store-substring 3 "bar" s)',));
    xit('(clear-string)',
        () => assertEval('(let ((s "nothing")) (clear-string s) s)', '""'));

    xit('(char-equal)', () => assertEvalT('(char-equal ?x 120)'));
    xit('(char-equal) with case-fold-search',
        () => assertEvalT('(let ((case-fold-search t)) (char-equal ?x ?X))'));
    xit('(string= "" "")', () => assertEvalT('(string= "" "")'));
    xit('(string= "a" "a")', () => assertEvalT('(string= "a" "a")'));
    xit('(string-equal "a" "a")', () => assertEvalT('(string-equal "a" "a")'));
    xit('(string-collate-equalp)');
    xit('string<'); xit('string-lessp');
    xit('string>'); xit('string-greaterp');
    xit('string-collate-lessp'); xit('string-collate-greaterp');
    xit('string-prefix-p'); xit('string-suffix-p');
    xit('compate-strings');
    xit('assoc-string');

    xit('(number-to-string 256)', () => assertEval('(number-to-string 256)', '"256"'));
    xit('(string-to-number "256")', () => assertEval('(string-to-number "256")', 256));
    xit('(string-to-number "24stop")', () => assertEval('(string-to-number "24stop")', 24));
    xit('(string-to-number "1f" 16)', () => assertEval('(string-to-number "1f" 16)', 31));
    xit('(char-to-string ?a)',  () => assertEval('(char-to-string ?a)', '"a"'));
    xit('(string-to-char "")',  () => assertEval('(string-to-char "")', 0));
    xit('(string-to-char "hi")', () => assertEval('(string-to-char "hi")', 104));

    xdescribe('format', () => {
      xit('(format'); xit('(format-message)');
    });

    xit('(downcase ?X)', () => assertEval('(downcase ?X)', 120));
    xit('(downcase "HeLLo")', () => assertEval('(downcase "HeLLo")', '"hello"'));
    xit('(upcase ?x)', () => assertEval('(upcase ?x)', 88));
    xit('(capitalize)', () => assertEval('The cat in the hat', 'The Cat In The Hat'));
    xit('(upcase-initials)');

    xdescribe('case tables', () => {});
  });

  /* lists */
  describe('car', () => {
    it("(car nil) == nil",      () => assertEval("(car nil)", "nil"));
    it("(car '(1 2)) == 1",     () => assertEval("(car '(1 2))", 1));
  })
  describe('cdr', () => {
    it("(cdr nil) == nil",      () => assertEval("(cdr nil)", "nil"));
    it("(cdr '(1 2)) == 1",     () => assertEval("(cdr '(1 2))", "(2)"));
  });

  describe('list', () => {
    it("(list) is nil",         () => assertEval("(list)", "nil"));
    it("(list (list)) is (nil)", () => assertEval("(list (list))", "(nil)"));
  });
  describe('cons', () => {
    it("(cons 1 nil)",          () => assertEval("(cons 1 nil)", "(1)"));
  });
});
