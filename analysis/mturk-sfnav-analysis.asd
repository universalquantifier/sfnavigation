(in-package #:asdf)

(defsystem mturk-sfnav-analysis
  :depends-on (st-json cl-ppcre util xlsx)
  :serial t
  :components ((:file "base-analysis")
               (:file "analysis")
               ;; (:file "geolocation-analysis")
               ))
