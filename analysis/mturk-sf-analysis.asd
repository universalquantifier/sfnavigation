(in-package #:asdf)

(defsystem mturk-sf-analysis
  :depends-on (st-json cl-ppcre util xlsx)
  :serial t
  :components ((:file "base-analysis")
               (:file "analysis")
               ;; (:file "geolocation-analysis")
               ))
