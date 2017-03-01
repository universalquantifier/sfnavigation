(in-package #:analysis)

(defvar *trial-alist* nil
  "used to mark the trial that a log file is part of.")

(defun set-logs-trial (trial &optional (analysis (ensure-analysis)))
  (push (cons trial (remove-if #'get-log-trial (analysis-subjects analysis))) *trial-alist*))

(defun get-log-trial (log)
  (car
   (find-if (lambda (l)
              (find log l :test #'eq))
            *trial-alist*)))

(defclass feedback (screen)
  ())

(defclass consent (screen)
  ())

(defclass demographicsurvey (screen)
  (condition))

(defclass gamequestions (screen)
  ())

(defclass message (screen)
  ())

(defclass game (screen)
  ())

(defclass gamestart (screen)
  ())

(defclass instructions (screen)
  ())

(defclass soundcheck (screen)
  ())

(defclass score (screen)
  ())

;; (defun drop-completes (&optional (analysis *analysis*))
;;   (loop for i in (analysis-subjects analysis)
;;         for num-problems = (count-if (lambda (s) (typep s 'trial)) (screens i))
;;         when (= num-problems 366)
;;           do ;;(print (list (id i) num-problems))
;;              (drop (id i))))

(defun drop-no-starts (&optional (analysis *analysis*))
  (loop for i in (analysis-subjects analysis)
        for num-problems = (count-if (lambda (s) (typep s 'game)) (screens i))
        when (= num-problems 0)
          do ;;(print (list (id i) num-problems))
             (drop (id i))))

(defun detect-browser (str)
  (cond
    ((ppcre:scan "Chrome" str)
     (ppcre:register-groups-bind (v) ("Chrome/([0-9]+(:?\.[0-9]+))" str)
       (format nil "Chrome ~A" v)))
    ((ppcre:scan "Android " str)
     (ppcre:register-groups-bind (v) ("Version/([0-9]+(:?\.[0-9]+))" str)
       (format nil "Android ~A" v)))
    ((ppcre:scan "Apple" str)
     (ppcre:register-groups-bind (v) ("Version/([0-9]+(:?\.[0-9]+)(:?\.[0-9]+))" str)
       (format nil "Safari ~A" v)))
    ((ppcre:scan "Firefox" str)
     (ppcre:register-groups-bind (v) ("Firefox/([0-9]+(:?\.[0-9]+))" str)
       (format nil "Firefox ~A" v)))
    ((ppcre:scan "MSIE" str)
     (ppcre:register-groups-bind (v) ("MSIE ([0-9]+(:?\.[0-9]+))" str)
       (format nil "IE ~A" v)))
    ((ppcre:scan "Opera" str)
     (ppcre:register-groups-bind (v) ("Opera/([0-9]+(:?\.[0-9]+))" str)
       (format nil "Opera ~A" v)))
    (t
     "Unknown")))

(defun read-summary-notes (&optional (analysis (ensure-analysis)))
  (with-open-file (s (make-pathname :name "log-notes"
                                    :type "txt"
                                    :defaults (analysis-pathname analysis)))
    (loop with ret = nil
          for l = (read-line s nil s)
          until (eq l s)
          do (ppcre:register-groups-bind (id notes) ("(.*?),(.*)" l)
               (push (list id notes) ret))
          finally (return ret))))

(defun participant-summary-sheet (logs)
  (labels ((count-correct (screen-type screens)
             (count-if (lambda (s)
                         (and (typep s screen-type)
                              (correct-p s)))
                       screens)))
    (let ((sheet (make-instance 'excel:sheet :name "Participants"))
          (notes (read-summary-notes)))
      (excel:add-row sheet "Participant" "Browser" "Condition" "Completed" "Resumes" "Duration (min)" "Games Completed" "Bonus" "Notes")
      (loop for l in logs
            for browser = (detect-browser (extract-key (first (screens l)) 'start :browser))
            for end-exp = (first (last (lines l)))
            for note = (second (find (id l) notes :key #'first :test #'string=))
            for bonus = (and (eq (line-id end-exp) 'experiment)
                             (getf (line-keys end-exp) :reward))
            for condition = "autoturn"
            ;; for dur = (/ (reduce #'+ (screens l) :key #'duration) 1000.0 60)
            for dur = (/ (reduce #'+ (remove-if (lambda (l)
                                                (typep l 'consent))
                                                (screens l))
                               :key #'duration) 1000.0 60)
          ;; for dur2 = (/ (reduce #'+ (screens l) :key #'duration) 1000.0 60)

            do ;; (assert bonus
               ;;         () "No bonus for ~A" (id l))
               (excel:add-row sheet
                              (id l)
                              browser
                              condition
                              (if (and (eq (line-id end-exp) 'experiment)
                                       (eq (line-tag end-exp) 'end))
                                  1 0)
                              (count-if (lambda (line)
                                          (and (eq (line-id line) 'experiment)
                                               (eq (line-tag line) 'start)
                                               (eq (getf (line-keys line) :resume) :true)))
                                        (lines l))
                              dur
                              (count-if (lambda (s) (typep s 'game)) (screens l))
                              (if bonus (/ bonus 100.0) nil)
                              note))
      sheet)))

(defun demographic-summary-sheet (logs)
  (let ((sheet (make-instance 'excel:sheet :name "Demographics")))
    (excel:add-row sheet "Participant" "Age" "Gender" "Ethnicity" "PlayedVideoGames" "CurrentlyPlay" "howLong" "Platform" "Frequency" "hoursPerWeek" "Relationship" "Heard")
    (dolist (l logs)
      (let ((screen (find-if (lambda (s) (typep s 'demographicsurvey)) (screens l))))
      (if screen
          (let ((survey (extract-key screen 'end :survey)))
            (excel:add-row sheet
                           (id l)
                           (parse-integer (getf survey :age))
                           (getf survey :gender)
                           (if (string= (getf survey :ethnicity) "other")
                               (getf survey :ethnicityOther)
                               (getf survey :ethnicity))
                           (getf survey :played)
                           (getf survey :currentlyPlay)
                           (getf survey :howLong)
                           (getf survey :platform)
                           (getf survey :freq)
                           (getf survey :hoursPlayed)
                           (getf survey :relationship)
                           (if (string= (getf survey :heard) "yes")
                               (getf survey :heardDescription)
                               (getf survey :heard))))
          (format t "~&~a has no demographic survey." (id l)))))
    sheet))

(defun feedback-summary-sheet (logs)
  (let ((sheet (make-instance 'excel:sheet :name "Feedback")))
    (excel:add-row sheet "Participant" "Field" "Text" "First Game" "Last Game" "playedBefore" "SimilarGame" "Physics")
    (dolist (l logs)
      (let ((p1 (find-if (lambda (s) (typep s 'gamequestions)) (screens l)))
            (p2 (find-if (lambda (s) (typep s 'feedback)) (screens l))))
      (if (and p1 p2)
          (let ((s1 (extract-key p1 'end :survey))
                (s2 (extract-key p2 'end :survey)))
            ;; (when (find #\& judgement :test #'char=)
            ;;   (setf judgement (substitute #\A #\& judgement :test #'char=)))
            (excel:add-row sheet (id l) "Prior Experience" nil nil nil
                           (getf s2 :playedbefore)
                           (getf s2 :game)
                           (getf s2 :physics))
            (excel:add-row sheet (id l) "Priority" nil (getf s1 :priority1) (getf s1 :priority2))
            (excel:add-row sheet (id l) "Attention" nil (getf s1 :attention1) (getf s1 :attention2))
            (excel:add-row sheet (id l) "Thrust" nil (getf s1 :thrust1) (getf s1 :thrust2))
            (excel:add-row sheet (id l) "Vlner" nil (getf s1 :vlner1) (getf s1 :vlner2))
            (excel:add-row sheet (id l) "Challenge" (getf s2 :challenge))
            (excel:add-row sheet (id l) "Feedback" (getf s2 :feedback))
            (excel:add-row sheet))
          (format t "~&~a has no feedback." (id l)))))
    sheet))

(defstruct csummary
  condition
  (abandoned 0)
  (never-started 0)
  (completed 0)
  (completed-weird 0))

;; (defun count-conditions (cheats &optional (analysis (ensure-analysis)))
;;   (loop with ret = (list (make-csummary :condition "graph-0-1")
;;                          (make-csummary :condition "graph-1-0")
;;                          (make-csummary :condition "graph-2-3")
;;                          (make-csummary :condition "graph-3-2")
;;                          (make-csummary :condition "nograph-0-1")
;;                          (make-csummary :condition "nograph-1-0")
;;                          (make-csummary :condition "nograph-2-3")
;;                          (make-csummary :condition "nograph-3-2"))
;;         for log in (analysis-subjects analysis)
;;         for condition = (get-condition log)
;;         for spot = (find-if (lambda (c) (string= condition (csummary-condition c))) ret)
;;         for end-exp = (first (last (screens log)))
;;         ;; duplicate problems pop up because of the cut-off screens
;;         for num-trials = (count-if (lambda (s) (typep s 'trial)) (screens log))
;;         for num-intervention = (count-if (lambda (s) (typep s 'intervention)) (screens log))
;;         for num-graphrec = (count-if (lambda (s) (typep s 'graphrecognition)) (screens log))
;;         for completedp = (and (typep end-exp 'experiment)
;;                               (has-tag end-exp 'end))
;;         for abandonedp = (not completedp)
;;         if (null spot) do (error "unknown condition ~A ~A" (id log) condition)
;;         if (find (id log) cheats :test #'string=)
;;           do (format t "skipping cheat ~a ~d ~a ~a ~a~%" (id log) condition num-trials completedp abandonedp)
;;         else
;;           do (when abandonedp
;;                (if (= num-trials 0)
;;                    (incf (csummary-never-started spot))
;;                    (incf (csummary-abandoned spot))))
;;              (when completedp
;;                (if (and (= num-trials 366)
;;                         (= num-intervention 36))
;;                    (progn
;;                      ;; (when (and (string= condition "nocue") (string= ordering "o-u"))
;;                      ;;   (format t "C ~a ~a ~a~%" (id log) condition ordering))
;;                      (incf (csummary-completed spot)))
;;                    (progn
;;                      (incf (csummary-completed-weird spot))
;;                      (format t "weird: ~a ~d~%" (id log) num-trials))))
;;         finally (format t "             C  A  W  N    T~%")
;;                 (loop for c in ret
;;                       do (format t "~11a ~2d ~2d ~2d ~2d | ~2d~%"
;;                                  (csummary-condition c)
;;                                  (csummary-completed c)
;;                                  (csummary-abandoned c)
;;                                  (csummary-completed-weird c)
;;                                  (csummary-never-started c)
;;                                  (+ (csummary-completed c)
;;                                     (csummary-abandoned c)
;;                                     (csummary-completed-weird c))))))


(defclass mp-analysis (analysis)
  ()
  (:default-initargs
   :survey-file-template "~A.*"
   :log-file-template "~A.*"
   :log-file-regexp (ppcre:create-scanner "^([0-9A-Z]+)\\.([0-9A-Z]+)\\.(?:[0-9A-Z]+)$")))

(defun ensure-analysis ()
  (or *analysis*
      (setf *analysis* (make-instance 'mp-analysis))))

(defun get-rewards (&optional (analysis (ensure-analysis)))
  (loop for log in (analysis-subjects analysis)
        for worker = (extract-key (first (screens log)) 'start :worker-id)
        for assignment = (extract-key (first (screens log)) 'start :assignment-id)
        for reward = (extract-key (first (last (screens log))) 'end :reward nil)
        do (when reward
             (format t "~A,~A,~A~%" worker assignment reward))))

;; (defun correct-checksum (&optional (analysis (ensure-analysis)))
;;   (loop for log in (analysis-subjects analysis)
;;         for worker = (extract-key (first (screens log)) 'start :worker-id)
;;         for reward = (extract-key (first (last (screens log))) 'end :reward nil)
;;         for correct = (count-if (lambda (s)
;;                                   (and (typep s 'trial)
;;                                        (correct-p s)))
;;                                 (screens log))
;;         for total = (count-if (lambda (s)
;;                                 (typep s 'trial))
;;                                 (screens log))
;;         do (format t "~14A ~2D/~2D ~2D~%" worker correct total reward)))

(defun payment-summary (&optional (analysis (ensure-analysis)))
  (labels ((total-duration (log)
             (reduce #'+ (screens log) :key #'duration))
           (get-reward (log)
             (let* ((end-exp (first (last (screens log))))
                    (bonus (extract-key end-exp 'end :reward nil)))
               bonus)))
    (loop with logs = (analysis-subjects analysis)
          for l in logs
          for r = (+ 2.00 (/ (get-reward l) 100.0))
          for d = (/ (total-duration l) 1000.0 60)
          collect r into r-total
          collect d into d-total
          do (format t "~15A ~,1F ~,2,,'0F~%" (id l) d r)
          finally (write-line "------------")
                  (format t "~15A ~,1F ~,2,,'0F~%" "" (apply #'avg d-total) (apply #'avg r-total)))))
