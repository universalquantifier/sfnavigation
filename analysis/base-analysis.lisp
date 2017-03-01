(defpackage #:analysis
  (:use :cl)
  (:export :logfile
           :survey
           :survey-hash
           :screen
           :lines
           :events
           :screens
           :surveys
           :correct-p
           :complete-p
           :duration
           :make-event
           :event-time
           :event-id
           :event-x
           :event-y
           :event-state
           :line-time
           :line-id
           :line-tag
           :line-keys
           :experiment
           :extract-key
           :extract-keys
           :extract-time
           :count-lines-if
           :count-tag
           :count-matches
           :average
           :avg
           :avg*
           :sum
           :dump-row
           :parse-duration
           :parse-correct-p
           :parse-complete-p
           :sanity-check
           :bool
           :id
           :just-screens
           :*analysis*
           :analysis
           :ensure-analysis
           :analysis-subjects
           :scan
           :dump
           :subjects
           :drop
           :clear
           :log-file-template
           :log-file-regexp
           :analysis-slurp-file
           :session
           :make-session
           :session-name
           :session-date
           :session-blocks
           :session-problems))

(in-package #:analysis)

(defstruct session
  name date blocks problems)

(defstruct survey
  hash)

(defstruct event
  time id x y state)

(defclass logfile ()
  ((lines :initarg :lines :accessor lines)
   (id :initarg :id :accessor id)
   (screens :initarg :screens :accessor screens)
   (surveys :initarg :surveys :accessor surveys)))

(defgeneric parse-screen (log screen-lines)
  (:documentation "Gather statistics from the screen lines and return a
class containing all the data."))

(defclass screen ()
  ((lines :initarg :lines :accessor lines)
   (events :initarg :events :accessor events)
   (correct-p :accessor correct-p)
   (complete-p :accessor complete-p)
   (duration :accessor duration)))

(defgeneric parse-duration (screen))
(defgeneric parse-correct-p (screen))
(defgeneric sanity-check (screen)
  (:method-combination and))
(defgeneric parse-complete-p (screen))

;; standard screen classes
(defclass experiment (screen)
  ((part :initarg :part :accessor part)))
(defclass message (screen) ())

;; First pass on the logs: slurp them into a list of screens

(defstruct line
  time id tag keys)

(defun jso-to-lisp (v)
  (cond
    ((typep v 'st-json:jso)
     (jso-to-plist v))
    ((consp v)
     (mapcar #'jso-to-lisp v))
    (t v)))

(defun jso-to-plist (jso)
  (let ((plist nil))
    (st-json:mapjso (lambda (k v)
                      (push (jso-to-lisp v)
                            plist)
                      (push (intern (string-upcase k) :keyword) plist))
                    jso)
    plist))

(defun toplevel-jso-to-plist (jso)
  (let ((plist nil))
    (st-json:mapjso (lambda (k v)
                      (unless (find k '("time" "screen" "tag") :test #'string=)
                        (push (if (typep v 'st-json:jso)
                                  (jso-to-plist v)
                                  v)
                              plist)
                        (push (intern (string-upcase k) :keyword) plist)))
                    jso)
    plist))

(defun slurp-stream (stream)
  (loop for line in (st-json:read-json stream)
        collect (make-line :time (st-json:getjso "time" line)
                           :id (intern (string-upcase (st-json:getjso "screen" line)))
                           :tag (intern (string-upcase (st-json:getjso "tag" line)))
                           :keys (jso-to-plist line))))

(defun slurp-file (file)
  (with-open-file (stream file)
    (slurp-stream stream)))

(defun read-survey (file)
  (with-open-file (s file)
    (let ((hash (make-hash-table :test 'equal)))
      (loop for l = (read-line s nil s)
            until (eq l s)
            do (when (plusp (length l))
                 (or (ppcre:register-groups-bind (key value) ("([a-zA-Z0-9]+)=(.*)" l)
                       (setf (gethash key hash) value))
                     (error "Can't parse line: ~s" l))))
      hash)))

(defmethod read-screens (lines)
  (loop
     for last = nil then i
     for i in lines
     for screen = (list i) then (cons i screen)
     when (and last
               (or (not (eq (line-id i) (line-id last)))
                   (string= (line-tag i) 'start)))
     collect (prog1
                 ;; screen's latest addition is from the next screen, so
                 ;; ditch it.
                 (make-instance (line-id (second screen))
                                :lines (reverse (cdr screen)))
               ;; (print "----")
               ;; (print (cdr screen))
               (setf screen (list i)))
     into ret
     finally (return (append ret (list (make-instance (line-id (first screen))
                                                      :lines (reverse screen)))))))

(defun format-datetime (time)
  (multiple-value-bind (s m h d mo y) (decode-universal-time time)
    (format nil "~2,'0d:~2,'0d:~2,'0d ~2,'0d/~2,'0d/~d" h m s d mo y)))

;; Fill in the default statistics

(defmethod parse-duration ((obj screen))
  (- (or (extract-time obj 'end nil)
         (line-time (car (last (lines obj)))))
     (or (extract-time obj 'start nil)
         (line-time (first (lines obj))))))

(defmethod parse-correct-p ((obj screen))
  nil)

(defmethod parse-complete-p ((obj screen))
  (string= (line-tag (car (last (lines obj)))) 'end))

(defmethod sanity-check and ((obj screen))
  t)

(defmethod shared-initialize :after ((obj screen) slots &key)
  (declare (ignore slots))
  (setf (duration obj) (parse-duration obj)
        (correct-p obj) (parse-correct-p obj)
        (complete-p obj) (parse-complete-p obj)))

;;; statistics gathering helper functions

(defun seconds (time)
  (/ time 1000))

(defun bool (stat)
  (ecase stat
    (:true 1)
    (:false 0)))

(defun extract-line-slot (screen tag slot &optional (error t))
  (let ((line (find tag (lines screen) :key 'line-tag :test 'string=)))
    (if line
        (funcall slot line)
      (when error (assert line)))))

(defun extract-time (screen tag &optional (error t))
  (extract-line-slot screen tag 'line-time error))

(defun extract-key (screen tag key &optional (error t) default)
  (getf (extract-line-slot screen tag 'line-keys error) key default))

(defun extract-keys (screen tag key)
  (loop for i in (lines screen)
        when (and (string= tag (line-tag i))
                  (getf (line-keys i) key))
          collect (getf (line-keys i) key)))

(defun has-tag (screen tag)
  (and (find tag (lines screen) :key 'line-tag :test 'string=) t))

(defun has-key (screen tag key)
  (let ((line (find tag (lines screen) :key 'line-tag :test 'string=)))
    (and line
         (getf (line-keys line) key)
         t)))

(defun count-lines-if (screen fn)
  (loop for i in (lines screen)
        count (funcall fn i)))

(defun count-tag (screen tag)
  (count-lines-if screen (lambda (x) (eq (line-tag x) tag))))

(defun count-matches (screen tag &rest keys &key &allow-other-keys)
  (count-lines-if screen
                  (lambda (l)
                    (and (string= (line-tag l) tag)
                         (loop for i = keys then (cddr i)
                              while i
                              for k = (first i)
                              for v = (second i)
                              always (eql (getf (line-keys l) k) v))))))

;;; summarizing helper functions

(defun avg (&rest numbers)
  (avg* numbers))

(defun avg* (numbers)
  (unless (zerop (length numbers))
    (/ (reduce '+ numbers) (length numbers))))

(defun average (screens slot &key (key 'identity))
  (if (plusp (length screens))
      (/ (loop for i in screens
	    sum (funcall key (slot-value i slot)))
	 (length screens))
      0))

(defun sum (screens slot &key (key 'identity))
  (loop for i in screens
           sum (funcall key (slot-value i slot))))

;;; reporting helper functions

(defun dump-row (sheet screen slots &rest formatters)
  (apply 'excel:add-row
         sheet
         (loop for i in slots
               for j from 0
               collect (funcall (or (nth j formatters)
                                    'identity)
                                (slot-value screen i)))))

(defun just-screens (log types &key block-separators (only-complete t))
  (unless (listp types)
    (setf types (list types)))
  (labels ((section-break-p (s)
             (and (typep s 'experiment)
                  ;; resume doesn't count as a section break
                  (not (or (eq (extract-key s 'start :session nil) :resume)
                           (extract-key s 'start :resume nil)))))
           (block-break-p (s)
             (some (lambda (type)
                     (typep s type))
                   block-separators))
           ;; (skip-break-screens (screen)
           ;;   (loop for s = (first screens)
           ;;         while (or (section-break-p s)
           ;;                   (block-break-p s))
           ;;         do (pop screens))
           ;;   screens)
           (pop-block (screens)
             ;;(setf screens (skip-break-screens screens))
             (loop for rest = screens then (cdr rest)
                   while rest
                   for s = (first rest)
                   when (block-break-p s)
                     do (pop rest)
                   until (or (section-break-p s)
                             (block-break-p s))
                   when (and (some (lambda (type) (typep s type)) types)
                             (or (not only-complete)
                                 (complete-p s)))
                   collect s into block
                   finally (return (list block rest))))
           (pop-session (screens section-name section-date)
             (loop with next-section-name = "unknown"
                   with next-section-date = nil
                   for ret = (pop-block screens) then (pop-block rest)
                   for b = (first ret)
                   for rest = (second ret)
                   for s = (first rest)
                   when b
                     if block-separators
                       collect b into session
                   else
                     append b into session
                   while rest
                   when (section-break-p s)
                     do (setf next-section-name (extract-key s 'start :session nil)
                              next-section-date (extract-key s 'start :date nil))
                        (pop rest)
                   until (section-break-p s)
                   finally (return (list (if session
                                             (if block-separators
                                                 (make-session :name section-name
                                                               :date section-date
                                                               :blocks session)
                                                 (make-session :name section-name
                                                               :date section-date
                                                               :problems session))
                                             nil)
                                         next-section-name
                                         next-section-date
                                         rest)))))
  (loop with screens = (screens log)
        with section-name = "none"
        with section-date = nil
        for ret = (pop-session screens section-name section-date)
        for s = (first ret)
        when s
          collect s
        do (setf section-name (second ret)
                 section-date (third ret)
                 screens (fourth ret))
        while screens)))

;;;;;;;; simple command interface

(defclass analysis ()
  ((subjects :initform nil :accessor analysis-subjects)
   (pathname :initform nil :accessor analysis-pathname)
   (log-file-template :initarg :log-file-template :accessor log-file-template)
   (log-file-regexp :initarg :log-file-regexp :accessor log-file-regexp)
   (survey-file-template :initarg :survey-file-template :accessor survey-file-template)))

(defgeneric read-subject (analysis id dir))
(defgeneric analysis-summarize (analysis))
(defgeneric analysis-slurp-file (analysis file))

(defmethod analysis-slurp-file ((analysis analysis) file)
  (slurp-file file))

(defvar *analysis* nil)

(defvar *warnings* nil)

(defun print-warnings ()
  (dolist (w (reverse *warnings*))
    (write-line w)))

(defun report-warning (fmt &rest args)
  (push (apply 'format nil fmt args) *warnings*))

(defmacro with-warnings (() &body body)
  `(let ((*warnings* nil))
     (handler-bind
         ((warning (lambda (c)
                     (report-warning "Warning: ~a" c)
                     (muffle-warning))))
       (prog1 (progn ,@body)
         (print-warnings)))))

#+lispworks
(defun choose-directory (&optional start-dir)
  (multiple-value-bind (result success)
      (capi:prompt-for-directory "Select a directory to scan" :pathname start-dir)
    (when success
      result)))

#+ccl
(defun choose-directory (&optional base)
  (declare (ignorable base))
  #+easygui
  (easygui:choose-directory-dialog :directory base)
  #-easygui
  (error "This code must be run from the Clozure CL IDE"))

#-(or lispworks ccl)
(defun choose-directory (&optional base)
  (error "CHOOSE-DIRECTORY is unimplemented on this platform."))

(defun screen-equal-p (s1 s2)
  (equalp (lines s1) (lines s2)))

(defun remove-dup-screens (screens)
  (loop for s in screens
        with existing = nil
        if (find s existing :test #'screen-equal-p)
          do (format t "!") (finish-output)
        else
          collect (progn (push s existing) s)))

(defmethod read-subject ((analysis analysis) id dir)
  (let* ((wild (make-pathname :name (format nil (log-file-template analysis) id)
                              :type "log"
                              :defaults dir))
         (survey-wild (make-pathname :name (format nil (survey-file-template analysis) id)
                                     :type "survey"
                                     :defaults dir))
         (files #+ccl (directory wild :directories nil :files t)
                #-(or ccl) (error "read-subject: unimplemented"))
         (survey-files #+ccl (directory survey-wild :directories nil :files t)
                       #-(or ccl) (error "read-subject: unimplemented")))
    (let ((logs (loop for f in files
                      for lines = (analysis-slurp-file analysis f)
                      for screens = (remove-dup-screens (read-screens lines))
                      do (unless (and (every 'sanity-check screens)
                                      (typep (first screens) 'experiment))
                           (report-warning "Sanity check fails for file ~a~%" f))
                      collect (make-instance 'logfile
                                             :lines lines
                                             :id id
                                             :screens screens)))
          (surveys (loop for f in survey-files
                         for hash = (read-survey f)
                         collect (make-survey :hash hash))))
      (when (> (length logs) 1)
        (print (list (length logs) files)))
      (setf logs (sort logs #'< :key (lambda (x)
                                       (extract-key (first (screens x)) 'start :part))))
      (make-instance 'logfile
                     :id id
                     :lines (mapcan #'lines logs)
                     :screens (mapcan #'screens logs)
                     :surveys surveys))))

(defun collect-dirs (base)
  (let* ((files #+ccl
                (directory (make-pathname :name :wild :type nil :defaults base)
                           :directories t :files nil)
                #+lispworks
                (directory (make-pathname :name nil :type nil :defaults base))
                #-(or ccl lispworks)
                (error "COLLECT-DIRS: unimplemented"))
         (dirs (loop for f in files
                     unless (or (stringp (pathname-name f))
                                (stringp (pathname-type f))
                                (and (stringp (car (last (pathname-directory f))))
                                     (char= (char (car (last (pathname-directory f))) 0) #\.)))
                       collect f)))
    (if dirs
        (append dirs (mapcan #'collect-dirs dirs))
        nil)))

(defun scan-for (base-dir scan-function)
  (mapcan scan-function (cons base-dir (collect-dirs base-dir))))

(defun scan-dir-for-subjects (base-dir regexp)
  "Return a list of subject files."
  (format nil "Scanning ~a ..." base-dir)
  (finish-output)
  (let* ((files (directory (make-pathname :name :wild :type "log" :defaults base-dir))))
    (loop for f in files
          with subjects = nil
          do (ppcre:register-groups-bind (subject) (regexp (pathname-name f))
               (pushnew subject subjects :test 'string=))
          finally (return (mapcar (lambda (s) (list s base-dir)) subjects)))))

(defun scan-for-subjects (base-dir regexp)
  (scan-for base-dir (lambda (d) (scan-dir-for-subjects d regexp))))

(defun string-or-number< (a b)
  (let ((n1 (ignore-errors (parse-integer a)))
        (n2 (ignore-errors (parse-integer b))))
    (if (and n1 n2)
        (< n1 n2)
        (string< a b))))

(defun scan (&key (dir (choose-directory)) (analysis (ensure-analysis)))
  (if dir
      (let ((subjects (sort (scan-for-subjects dir (log-file-regexp analysis)) 'string-or-number< :key 'first)))
        (loop for s on subjects
           when (find (caar s) (rest s) :key 'first :test 'equal)
           do (format t "Skipping subject ~a because it was found in multiple places:~%~{~a~%~}~%" (caar s)
                      (loop for i in subjects when (equal (caar s) (car i))
                         collect (second i)))
           (setf subjects (delete (caar s) subjects :key 'first :test 'equal)))
        (when (plusp (length subjects))
          (setf (analysis-pathname analysis) dir))
        (format t "Found ~D subjects: ~{~a~^ ~}~%" (length subjects) (mapcar 'first subjects))
        (setf (analysis-subjects analysis)
              (nconc (analysis-subjects analysis)
                     (loop for pair in subjects
                           for s = (first pair)
                           for dir = (second pair)
                           if (find s (analysis-subjects analysis) :key 'id :test 'equal)
                             do (format t "Subject ~A already exists. Skipping.~%" s)
                           else
                             collect (progn
                                       (format t "~&Reading subject ~A..." s)
                                       (finish-output)
                                       (with-warnings ()
                                         (prog1
                                             (read-subject analysis s dir)
                                           (format t "~%")
                                           (finish-output)))))))
        (format t "~&Done.~%"))
      (format t "No directory supplied. Aborting.~%"))
  (values))

(defun dump (name sheets &key summary-sheets single (analysis (ensure-analysis)))
  (if (analysis-subjects analysis)
      (let ((file (make-pathname :name name :type "xlsx" :defaults (analysis-pathname analysis)))
            (ss (make-instance 'excel:spreadsheet)))
        (if single
            (format t "Dumping sheets:")
            (format t "Dumping subjects:"))
        (finish-output)
        (setf (excel:sheets (excel:workbook ss))
              (if single
                  (loop :for sheet :in sheets
                        :do (format t " ~a" sheet)
                            (finish-output)
                        :collect (funcall sheet (analysis-subjects analysis)))
                  (append
                   (loop :for i :in summary-sheets
                         :collect (funcall i (analysis-subjects analysis)))
                   (loop :for i :in (analysis-subjects analysis)
                         :do (format t " ~a" (id i))
                             (finish-output)
                         :append (loop :for sheet :in sheets
                                       :for out = (funcall sheet i)
                                       :when out
                                       :collect out)))))
        (excel:save-spreadsheet ss file :if-exists :supersede)
        (format t "~&To: ~a~%" file)
        (format t "Done.~%"))
      (format t "No subjects to dump.~%"))
  (values))


(defun subjects (&key (analysis (ensure-analysis)))
  (if (analysis-subjects analysis)
      (format t "Subjects: ~{~a ~}~%" (mapcar 'id (analysis-subjects analysis)))
      (format t "No subjects.~%"))
  (values))

(defun drop (id &key (analysis (ensure-analysis)))
  (setf id (if (stringp id)
               id
               (prin1-to-string id)))
  (if (find id (analysis-subjects analysis) :key 'id :test 'equal)
      (format t "Deleting subject ~a.~%" id)
      (format t "Subject ~a not found.~%" id))
  (setf (analysis-subjects analysis) (delete id (analysis-subjects analysis) :key 'id :test 'equal))
  (values))

(defun clear (&key (analysis (ensure-analysis)))
  (if (analysis-subjects analysis)
      (format t "Clearing subjects ~{~a~^, ~}.~%" (mapcar 'id (analysis-subjects analysis)))
      (format t "No subjects to clear.~%"))
  (setf (analysis-subjects analysis) nil)
  (values))
