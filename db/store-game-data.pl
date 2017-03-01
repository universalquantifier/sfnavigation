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
if (params_present($q, 'assignment_id', 'worker_id', 'hit_id', 'events', 'log', 'session_id', 'game', 'log', 'events', 'keys')) {
  $log_block = 1;
}

# nothing to do.
if ($log_block == 0) {
  print '{"success": false, "reason": "nothing to do"}';
  #print '{"success": false}';
  exit 0;
}

my $dbname = "sf_navigation";
my $dsn = "DBI:mysql:database=$dbname:host=localhost";
my $db = DBI->connect($dsn, "exp", "password");

if (!$db) {
  print '{"success": false, "reason": "db connect failed"}';
  #print '{"success": false}';
  exit 0;
}

if ($log_block) {
  my $ret = $db->do('INSERT INTO game_data (remote_ip, worker_id, hit_id, assignment_id, session_id, game_number, keylog, log, events) VALUES (?,?,?,?,?,?,?,?,?)',
                    undef,
                    $q->remote_addr(),
                    scalar $q->param('worker_id'),
                    scalar $q->param('hit_id'),
                    scalar $q->param('assignment_id'),
                    scalar $q->param('session_id'),
                    scalar $q->param('game'),
                    scalar $q->param('keys'),
                    scalar $q->param('log'),
                    scalar $q->param('events'));
  if (!$ret) {
    my $err = $db->errstr;
    print "{\"success\": false, \"reason\": \"game_data db fail: $err\"}";
    #print '{"success": false}';
    exit 0;
  }
}

$db->disconnect();

# sleep 31;

print '{"success": true}';
