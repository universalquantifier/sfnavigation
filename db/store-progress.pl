#!/usr/bin/perl

use warnings;
use strict;

use DBI;
use CGI;                        #qw/-debug/;

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

exit 0 unless params_present($q, 'worker_id', 'assignment_id', 'idx', 'reward', 'game_reward', 'game_points', 'condition', 'rect_width', 'rect_length');

my $dbname = "sf_navigation";
my $dsn = "DBI:mysql:database=$dbname:host=localhost";
my $db = DBI->connect($dsn, "exp", "password");

if (!$db) {
  print '{"success": false, "reason": "db connect failed"}';
  exit 0;
}

my $exists = $db->prepare('SELECT worker_id FROM resume where worker_id = ?');
$exists->execute(scalar $q->param('worker_id'));
my $exists_ref = $exists->fetchrow_hashref();
if ($exists_ref) {
  my $query = $db->do('UPDATE resume SET idx = ?, reward = ?, game_reward = ?, game_points = ?, exp_condition = ?, rect_width = ?, rect_length = ? WHERE worker_id = ?',
                      undef,
                      scalar $q->param('idx'),
                      scalar $q->param('reward'),
                      scalar $q->param('game_reward'),
                      scalar $q->param('game_points'),
                      scalar $q->param('condition'),
                      scalar $q->param('rect_width'),
                      scalar $q->param('rect_length'),
                      scalar $q->param('worker_id'));
  if (!$query) {
    print '{"success": false, "reason": "update failed"}';
    exit 0;
  }
} else {
  my $query = $db->do('INSERT INTO resume (worker_id,assignment_id,idx,reward,game_reward,game_points,exp_condition,rect_width,rect_length) VALUES (?,?,?,?,?,?,?,?,?)',
                      undef,
                      scalar $q->param('worker_id'),
                      scalar $q->param('assignment_id'),
                      scalar $q->param('idx'),
                      scalar $q->param('reward'),
                      scalar $q->param('game_reward'),
                      scalar $q->param('game_points'),
                      scalar $q->param('condition'),
                      scalar $q->param('rect_width'),
                      scalar $q->param('rect_length'));
  if (!$query) {
    print '{"success": false, "reason": "insert failed"}';
    exit 0;
  }
}

# Keep a log of each resume
my $query = $db->do('INSERT INTO progress_log (worker_id,assignment_id,remote_ip,idx,reward,game_reward,game_points,exp_condition,rect_width,rect_length) VALUES (?,?,?,?,?,?,?,?,?,?)',
                    undef,
                    scalar $q->param('worker_id'),
                    scalar $q->param('assignment_id'),
                    $q->remote_addr(),
                    scalar $q->param('idx'),
                    scalar $q->param('reward'),
                    scalar $q->param('game_reward'),
                    scalar $q->param('game_points'),
                    scalar $q->param('condition'),
                    scalar $q->param('rect_width'),
                    scalar $q->param('rect_length'));
if (!$query) {
    print '{"success": false, "reason": "progress log failed"}';
    exit 0;
  }

print '{"success": true}';
exit 0;
