((lambda (n) (let ((t1 (float-time))) (while (<= 0 (setq n (- n 1)))) (- (float-time) t1))) 100000000)
