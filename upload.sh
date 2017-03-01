#!/bin/sh

mkdir -p staging
cp -R sound *.js sf.html spinner.svg snapshot.svg sf.css staging/
rsync -aze "ssh -i mturk/mturk/shawn-laptop.pem" staging/ ec2-user@andersonlab.net:sf/www-staging
