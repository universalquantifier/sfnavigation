#!/usr/bin/perl

use warnings;
use strict;

use DBI;

# @ARGV == 2 || die "You must specify a worker ID and assignment ID";

# my $worker_id = $ARGV[0];
# my $assignment_id = $ARGV[1];

my $dbname = "sf_navigation";
my $dsn = "DBI:mysql:database=$dbname:host=localhost";
my $db = DBI->connect($dsn, "exp", "password");

my $worker_cmd = $db->prepare("SELECT worker_id,assignment_id,hit_id from log_data GROUP BY worker_id");
$worker_cmd->execute();

mkdir "logs";

while (my $worker_ref = $worker_cmd->fetchrow_hashref()) {
  my $worker_id = $worker_ref->{'worker_id'};
  my $assignment_id = $worker_ref->{'assignment_id'};
  my $hit_id = $worker_ref->{'hit_id'};

  my $cmd = $db->prepare("SELECT id,log,extra from log_data where worker_id = ? ORDER BY id");
  $cmd->execute($worker_id);

  my $c = 0;
  while (my $ref = $cmd->fetchrow_hashref()) {

    print "$worker_id ... $ref->{extra}\n";

    my $name;
    if ($c == 0) {
      $name = "logs/$worker_id.$hit_id.$assignment_id.log";
    } else {
      $name = "logs/$worker_id..$hit_id.$assignment_id.$c.log";
    }
    open(LOG, ">$name");
    print LOG $ref->{log};
    close LOG;
    $c += 1;
  }
}
