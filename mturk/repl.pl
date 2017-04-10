use Data::Dumper;
use mturk::experiment;

sub create_hit_type {
  my $exp = shift;
  $exp->create_hit_type();
}

sub add_condition {
  my $exp = shift;
  my @args = @_;

  die "add_condition <condition>" unless scalar(@args) == 1;
  $exp->create_hit($args[0]);
}

sub create_initial_conditions {
  my $exp = shift;

  foreach my $c (keys(%{$exp->{hits}->{conditions}})) {
    if (scalar(@{$exp->{hits}->{conditions}->{$c}}) == 0) {
      $exp->create_hit($c);
    }
  }
}

sub add_assignment {
  my $exp = shift;
  my @args = @_;

  die "add <condition> <count> <token>" unless @args == 3;
  my $condition = $args[0];
  my $count = $args[1];
  my $token = $args[2];

  $exp->add_more_assignments($condition, $count, $token);
}

sub expire_hits {
    my $exp = shift;
    $exp->expire_hits();
}

sub dispose_hits {
    my $exp = shift;
    $exp->dispose_hits();
}

sub hit_status {
  my $exp = shift;
  $exp->hit_status();
}

sub download_assignments {
    my $exp = shift;
    $exp->download_all_assignment_data();
};

sub approve_assignments {
  my $exp = shift;

  $exp->summarize_submitted_assignments();
  printf "Confirm (yes/no) ?\n";
  my $confirm = <STDIN>;
  chomp $confirm;

  if ($confirm eq 'yes') {
    $exp->approve_submitted_assignments();
  }
}

sub report_mode {
  my $exp = shift;

  $exp->report_mode();
}


my $exp = mturk::experiment->new();

# print Dumper($exp);

if (scalar(@ARGV) == 0) {
  die <<USAGE;
USAGE: $0 <command> [arg] ...
USAGE
}

$cmd = $ARGV[0];

my $commands = { 'create' => \&create_hit_type,
                 'expire' => \&expire_hits,
                 'dispose' => \&dispose_hits,
                 'initial-conditions' => \&create_initial_conditions,
                 'add-hit' => \&add_condition,
                 'add-slots' => \&add_assignment,
                 'status' => \&hit_status,
                 'download' => \&download_assignments,
                 'approve' => \&approve_assignments,
                 'mode' => \&report_mode
               };

if (exists $commands->{$cmd}) {
  &{$commands->{$cmd}}($exp, @ARGV[1..$#ARGV]);
} else {
  die "Unknown command: $cmd";
}
