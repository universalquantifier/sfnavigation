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

my $worker_cmd = $db->prepare("SELECT worker_id,assignment_id,hit_id from game_data GROUP BY worker_id");
$worker_cmd->execute();

$| = 1;

while (my $worker_ref = $worker_cmd->fetchrow_hashref()) {
    my $worker_id = $worker_ref->{'worker_id'};
    my $assignment_id = $worker_ref->{'assignment_id'};
    my $hit_id = $worker_ref->{'hit_id'};

    my $cmd = $db->prepare("SELECT id,game_number,keylog,events,log from game_data where worker_id = ? ORDER BY game_number");
    $cmd->execute($worker_id);

    print "$worker_id ... ";


    # Eliminate duplicates
    my $games = [];
    while (my $ref = $cmd->fetchrow_hashref()) {
        my $exists = 0;
        foreach my $r (@$games) {
            if ($r->{'game_number'} == $ref->{'game_number'} &&
                $r->{'keylog'} eq $ref->{'keylog'} &&
                $r->{'log'} eq $ref->{'log'} &&
                $r->{'events'} eq $ref->{'events'}) {
                $exists = 1;
                print "!";
                last;
            }
        }
        if (!$exists) {
            push @$games, $ref;
        }
    }

    # Games can be submitted more than once. Usually there is a real
    # game and then an empty game when they tried to reload.
    my $seen = {};
    for my $g (@$games) {
        my $gnum = $g->{'game_number'};
        mkdir "logs/$worker_id";

        my $dup = '';
        if (exists($seen->{$gnum})) {
            print " DUP";
            $dup = "_$seen->{$gnum}";
            $seen->{$gnum} += 1;
        } else {
            $seen->{$gnum} = 1;
        }

        open(KEYLOG, ">logs/$worker_id/$worker_id.$assignment_id.$gnum$dup.keylog");
        open(EVENTS, ">logs/$worker_id/$worker_id.$assignment_id.$gnum$dup.events");
        open(LOG, ">logs/$worker_id/$worker_id.$assignment_id.$gnum$dup.log");

        print KEYLOG $g->{'keylog'};
        print EVENTS $g->{'events'};
        print LOG $g->{'log'};

        close KEYLOG;
        close EVENTS;
        close LOG;
        print " $gnum";
    }
    print "\n";
}
