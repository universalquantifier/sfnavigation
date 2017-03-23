#!/bin/sh

mkdir -p staging
cp -R sound *.js sf.html spinner.svg thrust-illustration.svg ccwise.png cwise.png g.png sf.css staging/
rsync -aze "ssh -i mturk/mturk/shawn-laptop.pem" staging/ ec2-user@andersonlab.net:sfnavigation/www-staging
rsync -aze "ssh -i mturk/mturk/shawn-laptop.pem" db/ ec2-user@andersonlab.net:sfnavigation/db
