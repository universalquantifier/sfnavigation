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

my $worker_cmd = $db->prepare("SELECT worker_id,assignment_id,hit_id from log_block GROUP BY worker_id");
$worker_cmd->execute();

while (my $worker_ref = $worker_cmd->fetchrow_hashref()) {
    my $worker_id = $worker_ref->{'worker_id'};
    my $assignment_id = $worker_ref->{'assignment_id'};
    my $hit_id = $worker_ref->{'hit_id'};

    my $cmd = $db->prepare("SELECT id,sync_id,log from log_block where worker_id = ? ORDER BY id");
    $cmd->execute($worker_id);

    print "$worker_id ... ";

    open(LOG, ">logs/$worker_id.$hit_id.$assignment_id.log");

    # Eliminate duplicates
    my $blocks = [];
    while (my $ref = $cmd->fetchrow_hashref()) {
        my $exists = 0;
        foreach my $r (@$blocks) {
            if ($r->{'sync_id'} == $ref->{'sync_id'} &&
                $r->{'log'} eq $ref->{'log'} &&
                ($r->{'sync_id'} != 0 ||
                 $r->{'log'} =~ /:resume nil/)) {
                $exists = 1;
                last;
            }
        }
        if (!$exists) {
            push @$blocks, $ref;
        }
    }
    # Assemble into runs
    my $runs = [];
    my $run = [];
    foreach my $r (@$blocks) {
        if ($r->{'sync_id'} == 0) {
            my @l = sort { $a->{'sync_id'} <=> $b->{'sync_id'} } @$run;
            push @$runs, \@l;
            $run = [];
        }
        push @$run, $r;
    }
    if (@$run > 0) {
        my @l = sort { $a->{'sync_id'} <=> $b->{'sync_id'} } @$run;
        push @$runs, \@l;
    }
    print LOG "[";
    my $first = 1;
    for my $run (@$runs) {
        for my $r (@$run) {
            printf (" %d", $r->{'sync_id'});
            if ($r->{'log'} =~ /^\[(.*)\]$/) {
              print LOG ',' unless $first;
              print LOG $1;
              $first = 0;
            } else {
              print LOG $r->{'log'};
            }
        }
    }
    print LOG "]";
    print "\n";

    close LOG;
}
