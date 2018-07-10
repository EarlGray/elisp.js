((lambda (n) (let ((t1 (float-time))) (while (<= 0 (setq n (- n 1)))) (print (- (float-time) t1)))) 20000000)
