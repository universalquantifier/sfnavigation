package mturk::experiment;

use strict;
use YAML ();
use Data::Dumper;
use MIME::Base64;
use XML::Parser;
use Net::Amazon::MechanicalTurk;
use JSON;

sub _mturk_service_url {
  my $mode = shift;
  if ($mode eq 'live') {
    return 'https://mechanicalturk.amazonaws.com/?Service=AWSMechanicalTurkRequester';
  } else {
    return 'https://mechanicalturk.sandbox.amazonaws.com/?Service=AWSMechanicalTurkRequester';
  }
}

sub new {
  my ($class, @args) = @_;
  my $config = YAML::LoadFile("config.yaml");
  my $basedir = sprintf("%s-%s-%s-%s",
                        $config->{experiment}->{mode},
                        $config->{experiment}->{name},
                        $config->{experiment}->{version},
                        $config->{experiment}->{batch});
  my $url = _mturk_service_url($config->{experiment}->{mode});
  my $self = bless { config => $config,
                     mturk => Net::Amazon::MechanicalTurk->new(
                                                               serviceUrl     => $url,
                                                               serviceVersion => '2014-08-15',
                                                              ),
                     basedir => $basedir,
                     hits_file => $basedir . "/hits.yaml",
                     assignments_file => $basedir . "/assignments.yaml"
                   }, $class;
  $self->_do_substitutions();
  $self->_ensure_basedir();
  $self->_load_hits();
  $self->_load_assignments();
  return $self;
}

sub _do_substitutions {
  my $exp = shift;

  $exp->{config}->{HIT}->{description} =~ s/<<maxbonus>>/\$$exp->{config}->{HIT}->{max_bonus}/g;
}

sub _ensure_basedir {
  my $exp = shift;

  if (-e $exp->{basedir}) {
    die "$exp->{basedir} is not a directory" unless -d $exp->{basedir};
  } else {
    mkdir $exp->{basedir};
  }
}

sub is_live {
  my $exp = shift;
  return $exp->{config}->{experiment}->{mode} eq 'live';
}

sub report_mode {
  my $exp = shift;
  my $mode = $exp->{config}->{experiment}->{mode};
  my $url = _mturk_service_url();
  print "mode = $mode\nurl = $url\n";
}

sub confirm_mode {
  my $exp = shift;
  $exp->report_mode();
  print "Confirm (yes/no) ?\n";
  my $confirm = <STDIN>;
  chomp $confirm;
  exit(0) if ($confirm ne 'yes');
}

# FIXME: This is probably broken
sub _expand_conditions {
  my $template = shift;
  if (scalar(@$template) <= 1) {
    return $template->[0];
  } else {
    my @ret;
    my @butlast = @$template[1..$#{$template}];
    my $expanded = _expand_conditions(\@butlast);
    foreach my $i (@$expanded) {
      foreach my $c (@{$template->[0]}) {
        push @ret, "$c-$i";
      }
    }
    return @ret;
  }
}

sub _create_empty_condition_hit_lists($) {
  my $exp = shift;
  my $ret = {};

  my @conditions = _expand_conditions($exp->{config}->{experiment}->{conditions});
  foreach my $c (@conditions) {
    $ret->{$c} = [];
  }
  return $ret;
}

sub _load_hits ($) {
  my $exp = shift;
  my $hits;

  if (-e $exp->{hits_file}) {
    $hits = YAML::LoadFile($exp->{hits_file});
  } else {
    $hits = {};
    $hits->{conditions} = $exp->_create_empty_condition_hit_lists();
  }
  $exp->{hits} = $hits;
  return $hits;
}

sub _save_hits($) {
  my $exp = shift;

  YAML::DumpFile($exp->{hits_file}, $exp->{hits});
}

sub _load_assignments($) {
  my $exp = shift;
  my $assignments;

  if (-e $exp->{assignments_file}) {
    $assignments = YAML::LoadFile($exp->{assignments_file});
  } else {
    $assignments = {};
  }
  $exp->{assignments} = $assignments;
  return $assignments;
}

sub _save_assignments($) {
  my $exp = shift;
  YAML::DumpFile($exp->{assignments_file}, $exp->{assignments});
}

sub create_hit_type ($) {
  my $exp = shift;

  my $result = $exp->{mturk}->RegisterHITType(
                                              Title => $exp->{config}->{HIT}->{title},
                                              Description => $exp->{config}->{HIT}->{description},
                                              Keywords => join(',', @{$exp->{config}->{HIT}->{keywords}}),
                                              Reward => {
                                                         CurrencyCode => 'USD',
                                                         Amount => $exp->{config}->{HIT}->{base_pay}
                                                        },
                                              AssignmentDurationInSeconds => 60 * 60 * $exp->{config}->{HIT}->{duration},
                                              AutoApprovalDelayInSeconds  => 60*60*24*15, # 15 days
                                             );

  my $id = $result->{HITTypeId}[0];
  $exp->{hits}->{hit_type} = $id;
  $exp->_save_hits();

  printf "HitTypeId: %s\n", $id;

  return $id;
}

sub create_hit ($) {
  my $exp = shift;
  my $condition = shift;
  my $num_assignments = 1;

  die "no hit type" unless defined $exp->{hits}->{hit_type};
  die "no matching condition" unless exists $exp->{hits}->{conditions}->{$condition};


  my $url = $exp->{config}->{HIT}->{url} . "?condition=$condition";
  my $height = $exp->{config}->{HIT}->{frame_height};
  my $questionxml = <<QUESTION;
<?xml version="1.0"?>
<ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">
  <ExternalURL>$url</ExternalURL>
  <FrameHeight>$height</FrameHeight>
</ExternalQuestion>
QUESTION

  my $result =
    $exp->{mturk}->CreateHIT(
                             HITTypeId => $exp->{hits}->{hit_type},
                             Question => $questionxml,
                             MaxAssignments => $num_assignments,
                             LifetimeInSeconds => $exp->{config}->{HIT}->{lifetime} * 60 * 60 * 24,
                             ResponseGroup => ['Minimal', 'HITDetail']
                            );

  my $hit_id = $result->{HITId}[0];
  my $group_id = $result->{HITGroupId}[0];

  printf "HitId: %s\n", $hit_id;
  printf "GroupId: %s\n", $group_id;

  # FIXME: make sure it's always the same.
  if (exists $exp->{hits}->{group_id} &&
      $exp->{hits}->{group_id} ne $group_id) {
    print "group ID mismatch: $exp->{hits}->{group_id} != $group_id\n";
  }
  $exp->{hits}->{group_id} = $group_id;
  push @{$exp->{hits}->{conditions}->{$condition}}, $hit_id;

  $exp->_save_hits();

  return ($hit_id, $group_id);
}

sub add_more_assignments ($$) {
  my $exp = shift;
  my $condition = shift;
  my $extra_assignments = shift;
  my $token = shift;

  die "no matching condition" unless exists $exp->{hits}->{conditions}->{$condition};

  my $hit_to_use;
  foreach my $h (@{$exp->{hits}->{conditions}->{$condition}}) {
    my $result = $exp->{mturk}->GetHIT(HITId => $h, ResponseGroup => 'HITDetail');
    my $max = $result->{MaxAssignments}->[0];
    if ($max < 9) {
      $hit_to_use = $h;
      print "$h max=$max add=$extra_assignments\n";
      last;
    }
  }
  $exp->{mturk}->ExtendHIT(HITId => $hit_to_use,
                           MaxAssignmentsIncrement => $extra_assignments,
                           #ExpirationIncrementInSeconds => $extra_time,
                           UniqueRequestToken => $token
                          );
}

sub expire_hits ($$) {
  my $exp = shift;

  foreach my $c (sort(keys(%{$exp->{hits}->{conditions}}))) {
    print ("$c:\n");
    foreach my $h (@{$exp->{hits}->{conditions}->{$c}}) {
      print "  $h:";
      my $ret = $exp->{mturk}->ForceExpireHIT(HITId => $h);
      if ($ret->{Request}->[0]->{IsValid}->[0]) {
        print ' [expire]';
      } else {
        print ' [expire FAILED]';
      }
      print "\n";
    }
  }
}

sub dispose_hits ($$) {
  my $exp = shift;

  foreach my $c (sort(keys(%{$exp->{hits}->{conditions}}))) {
    print ("$c:\n");
    foreach my $h (@{$exp->{hits}->{conditions}->{$c}}) {
      print "  $h:";
      my $ret = $exp->{mturk}->ForceExpireHIT(HITId => $h);
      if ($ret->{Request}->[0]->{IsValid}->[0]) {
        print ' [expire]';
      } else {
        print ' [expire FAILED]';
      }
      $ret = $exp->{mturk}->DisposeHIT(HITId => $h);
      if ($ret->{Request}->[0]->{IsValid}->[0]) {
        print ' [dispose]';
      } else {
        print ' [dispose FAILED]';
      }
      print "\n";
    }

    $exp->{hits}->{conditions} = $exp->_create_empty_condition_hit_lists();
    $exp->_save_hits();
  }
}

########

sub dollars {
    my $cents = shift;
    if ($cents =~ /^(\d+)(\d\d)$/) {
        return "$1.$2";
    } elsif ($cents =~ /^\d$/) {
        return "0.0$cents";
    } elsif ($cents =~ /^\d\d$/) {
        return "0.$cents";
    } else {
        die "Dunno how to format cents: '$cents'";
    }
}

sub grant_bonus {
  my ($exp, $worker, $assignment_id, $bonus, $token) = @_;

  if ($bonus > 0) {
    $exp->{mturk}->GrantBonus( WorkerId => $worker,
                               AssignmentId => $assignment_id,
                               Reason => 'Here is your performance bonus. Thanks for participating!',
                               BonusAmount => {
                                               CurrencyCode => 'USD',
                                               Amount => dollars($bonus)
                                              },
                               UniqueRequestToken => $token
                             );
  }
}

sub summarize_submitted_assignments {
  my $exp = shift;
  my @records = ();
  my $sum = 0;

  open(FH,"<$exp->{basedir}/assignments.txt");
  foreach my $id (keys (%{$exp->{assignments}})) {
    my $a = $exp->{assignments}->{$id};
    my $d = dollars($a->{bonus});
    next if $a->{approved} && $a->{bonus_awarded};
    print "Worker=$a->{worker_id}";
    if (!$a->{approved}) {
      print " Assignment=$id";
    }
    if (!$a->{bonus_awarded}) {
      print " Bonus=$d";
      $sum += $a->{bonus};
      # mturk fee
      $sum += sprintf("%.0f", $a->{bonus}* 0.2);
      print " TOTAL=$sum $a->{bonus}";
    }
    print "\n";
  }
  close(FH);

  printf "\nTotal = %d = %.4f\n\n", $sum, $sum/100;
}

sub approve_submitted_assignments {
  my $exp = shift;
  my @records = ();

  foreach my $id (keys (%{$exp->{assignments}})) {
    my $a = $exp->{assignments}->{$id};
    next if $a->{approved} && $a->{bonus_awarded};
    print "[worker $a->{worker_id}]";
    unless ($a->{approved}) {
      $exp->{mturk}->ApproveAssignment ( AssignmentId => $id );
      $a->{approved} = 1;
      $exp->_save_assignments();
      print " [assignment $id]";
    }
    unless ($a->{bonus_awarded}) {
      grant_bonus($exp, $a->{worker_id}, $id, $a->{bonus}, $id);
      $a->{bonus_awarded} = 1;
      $exp->_save_assignments();
      printf( " [bonus %s]\n", dollars($a->{bonus}) );
    }
    print "\n";
  }
}

#######

sub hit_status ($) {
  my $exp = shift;

  foreach my $c (sort(keys(%{$exp->{hits}->{conditions}}))) {
    print ("$c:\n");
    foreach my $h (@{$exp->{hits}->{conditions}->{$c}}) {
      my $result = $exp->{mturk}->GetHIT(HITId => $h,
                                         ResponseGroup => ['HITDetail','HITAssignmentSummary']);
      #print Dumper($result);
      my $max = $result->{MaxAssignments}->[0];
      my $completed = $result->{NumberOfAssignmentsCompleted}->[0];
      my $available = $result->{NumberOfAssignmentsAvailable}->[0];
      my $pending = $result->{NumberOfAssignmentsPending}->[0];
      printf ("  $h max=%-2d completed=%-2d available=%-2d pending=%-2d\n", $max, $completed, $available, $pending);

      #print Dumper($result);
    }
  }
}


#######


sub _xml_extract_answer {
  my $tree = shift;
  my $ofs = shift;

  if ($tree->[1]->[$ofs] ne 'Answer' ||
      $tree->[1]->[$ofs+1]->[3] ne 'QuestionIdentifier' ||
      $tree->[1]->[$ofs+1]->[7] ne 'FreeText') {
    die "Bad XML tree at $ofs";
  }

  # print "\nofs: $ofs\n";

  # print Dumper($tree->[1]->[$ofs+1]);

  my $question = $tree->[1]->[$ofs+1]->[4]->[2];
  my $answer = '';
  if (scalar @{$tree->[1]->[$ofs+1]->[8]} > 1) {
    $answer = $tree->[1]->[$ofs+1]->[8]->[2];
  }

  # print Dumper($question);
  # print Dumper($answer);

  return ($question,$answer);
}

sub _get_answers {
  my $xml = shift;
  my $parser = new XML::Parser(Style => 'Tree');
  my $tree = $parser->parse($xml);
  my %answers;

  if ($tree->[0] ne 'QuestionFormAnswers') {
    die "Bad XML tree.";
  }

  for (my $i=3; $i<scalar(@{$tree->[1]}); $i+=4) {
    my ($question, $answer) = _xml_extract_answer($tree,$i);
    $answers{$question} = $answer;
  }

  if (!(exists $answers{'bonus'} && exists $answers{'resumes'} && exists $answers{'condition'})) {
    print(Dumper(%answers));
    die "log isn't in XML.";
  }

  return \%answers;
}

sub get_submitted_assignments {
  my $exp = shift;
  my $hit_id = shift;

  my @ret = ();

  for (my $page = 1;; $page++) {
    my $assignments = $exp->{mturk}->GetAssignmentsForHIT(
                                                          HITId => $hit_id,
                                                          AssignmentStatus => 'Submitted',
                                                          PageSize => 10,
                                                          PageNumber => $page
                                                         );

    if ($assignments->{NumResults}[0] == 0) {
      printf ("%d assignments.\n", scalar @ret) if (@ret > 0);
      return \@ret;
    }
    for (my $i=0; $i<$assignments->{NumResults}[0]; $i++) {
      my $answers = _get_answers($assignments->{Assignment}[$i]->{Answer}->[0]);
      # print Dumper($answers);
      push @ret, { AssignmentId => $assignments->{Assignment}->[$i]->{AssignmentId}->[0],
                   WorkerId => $assignments->{Assignment}->[$i]->{WorkerId}->[0],
                   HITId => $assignments->{Assignment}->[$i]->{HITId}->[0],
                   Bonus => $answers->{bonus},
                   Condition => $answers->{condition},
                   Resumes => $answers->{resumes}
                 };
    }
  }
  die "We never get here.";
}

sub save_assignment_data {
  my $exp = shift;
  my $assignment = shift;

  $exp->{assignments}->{$assignment->{AssignmentId}} = { worker_id => $assignment->{WorkerId},
                                                         hit_id => $assignment->{HITId},
                                                         bonus => $assignment->{Bonus},
                                                         approved => 0,
                                                         bonus_awarded => 0
                                                       };
  $exp->_save_assignments();
}

sub download_all_assignment_data {
  my $exp = shift;

  foreach my $c (sort(keys(%{$exp->{hits}->{conditions}}))) {
    print ("$c:\n");
    foreach my $h (@{$exp->{hits}->{conditions}->{$c}}) {
      print "  $h: ";
      my $assignments = $exp->get_submitted_assignments($h);
      foreach my $a (@$assignments) {
        print "    $a->{WorkerId}";
        if ($a->{Resumes}) {
          print " [RESUMED]";
        }
        print " [bonus $a->{Bonus}]";
        $exp->save_assignment_data($a);
        print " [saved]";
        print "\n";
      }
    }
  }
}

1;

