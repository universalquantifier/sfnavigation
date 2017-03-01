#!/usr/bin/perl

use warnings;
use strict;

use DBI;
use CGI; #qw/-debug/;

sub params_present {
  my $q = shift;
  my @params = @_;

  foreach my $p (@params) {
      if (!defined $q->param($p)) {
          return 0;
      }
  }
  return 1;
}


my $q = CGI->new;

print $q->header ('text/plain');

my $log_block = 0;
# The following params must be present
exit 0 unless (params_present($q, 'assignment_id', 'worker_id', 'hit_id', 'log', 'extra'));

my $dbname = "sf_navigation";
my $dsn = "DBI:mysql:database=$dbname:host=localhost";
my $db = DBI->connect($dsn, "exp", "password");

if (!$db) {
  print '{"success": false, "reason": "db connect failed"}';
  #print '{"success": false}';
  exit 0;
}

my $ret = $db->do('INSERT INTO log_data (remote_ip, worker_id, hit_id, assignment_id, log, extra) VALUES (?,?,?,?,?,?)',
                  undef,
                  $q->remote_addr(),
                  scalar $q->param('worker_id'),
                  scalar $q->param('hit_id'),
                  scalar $q->param('assignment_id'),
                  scalar $q->param('log'),
                  scalar $q->param('extra'));
if (!$ret) {
    print '{"success": false, "reason": "log_data db fail"}';
    #print '{"success": false}';
    exit 0;
}

$db->disconnect();

print '{"success": true}';
