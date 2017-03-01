#!/usr/bin/perl

use warnings;
use strict;

use DBI;
use CGI; #qw/-debug/;

use List::Util qw(shuffle);

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

exit 0 unless params_present($q, 'worker_id', 'assignment_id');

my $worker_id = $q->param('worker_id');

my $dbname = "sf_navigation";
my $dsn = "DBI:mysql:database=$dbname:host=localhost";
my $db = DBI->connect($dsn, "exp", "password");

if (!$db) {
  print '{"success": false, "reason": "db connect failed"}';
  exit 0;
}

# Did they participate in an earlier study?

my $rejq = $db->prepare('SELECT worker_id from rejects where worker_id = ?');
$rejq->execute(scalar $q->param('worker_id'));
my $rejref = $rejq->fetchrow_hashref();

if ($rejref) {
    $db->do('INSERT INTO reject_log (worker_id, remote_ip, reason) VALUES (?,?,?)',
            undef,
            $q->param('worker_id'),
            $q->remote_addr(),
            'reject');
    print '{"success": true, "reject": true, "reason": "reject"}';
    exit 0;
}

my $query = $db->prepare('SELECT * FROM resume WHERE worker_id = ?');
$query->execute($worker_id);
my $ref = $query->fetchrow_hashref();
$query->finish();
if ($ref) {
  # Make sure assignment_ids are the same.
  if ($ref->{assignment_id} eq $q->param('assignment_id') || $ref->{assignment_id} eq 'override') {
    # Log the resume
    $db->do('INSERT INTO resume_log (worker_id, assignment_id, remote_ip, idx, reward, game_reward, game_points, exp_condition, rect_width, rect_length) VALUES (?,?,?,?,?,?,?,?,?,?)',
            undef,
            scalar $q->param('worker_id'),
            scalar $q->param('assignment_id'),
            $q->remote_addr(),
            $ref->{idx},
            $ref->{reward},
            $ref->{game_reward},
            $ref->{game_points},
            $ref->{last_block},
            $ref->{exp_condition},
            $ref->{rect_width},
            $ref->{rect_length}
           );
    my $needs_quotes = $ref->{idx} =~ /\D/;
    my $cnq = $ref->{exp_condition} eq "" || $ref->{exp_condition} =~ /\D/;

    printf '{"success": true, "reject": false, "resumable": true, "idx": %s%s%s, "reward": %s, "game_reward": %s, "game_points": %s, "rect_width": %s, "rect_length": %s, "condition": %s%s%s}', $needs_quotes?'"':'', $ref->{idx}, $needs_quotes?'"':'',, $ref->{reward}, $ref->{game_reward}, $ref->{game_points}, $ref->{rect_width}, $ref->{rect_length}, $cnq?'"':'', $ref->{exp_condition}, $cnq?'"':'';
  } else {
    $db->do('INSERT INTO reject_log (worker_id, remote_ip, reason) VALUES (?,?,?)',
            undef,
            scalar $q->param('worker_id'),
            $q->remote_addr(),
            'assignment-mismatch');
    print '{"success": true, "reject": true, "reason": "assignment-mismatch"}';
    exit 0;
  }
} else {
    print '{"success": true, "resumable": false, "reject": false}';
}

$db->disconnect();
exit 0;
