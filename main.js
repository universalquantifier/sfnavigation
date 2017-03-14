function consent_html(include_inputs) {
    var html = '';
    html += '<div class="message-text">';
    html += '<h3>Introduction</h3>';
    html += '<p>This task is part of a research study conducted by Dr. John R. Anderson at Carnegie Mellon University.';

    html += '<p>The purpose of this research is to assess the ability to learn a dynamic task.';

    html += '<h3>Procedures</h3>';
    html += '<p>You will be asked to participate.';

    html += '<p>In this study, you must learn to control a space craft in a frictionless environment. Each game lasts 2 minutes, during which your goal will be to maximize your score. There are 20 games in this study.';

    html += '<p>The expected duration of this study is about an hour.';

    html += '<h3>Participant Requirements</h3>';
    html += '<p>Participation in this study is limited to individuals ages 18 to 40.';

    html += '<h3>Compensation & Costs</h3>';
    html += '<p>You will be compensated for your time on task. You will be compensated $4 for this HIT. For each game you will earn a bonus of up to $0.60. The maximum bonus for 20 games is $12. The total maximum payout for this HIT is $4&nbsp;+&nbsp;$12&nbsp;=&nbsp;<b>$16</b>. There will be no cost to you if you participate in this study.';

    if (include_inputs) {
        html += '<p><input type="checkbox" id="ofage" name="consent" value="ofage" onclick="return checkConsent();">I am between 18 and 40 years old.<br/>';
        html += '<input type="checkbox" id="understands" name="consent" value="understands" onclick="return checkConsent();">I have read and understand the information above.<br/>';
        html += '<input type="checkbox" id="participate" name="consent" value="participate" onclick="return checkConsent();">I want to participate in this research and continue with the activity.';
    }
    html += '</div>';

    return html;
}

function getInstructions(page) {
    switch (page) {
    case 0:
        return ('<p style="text-align: justify">In this study you will be playing a game called Space Fortress. You control a spaceship in a two dimensional, frictionless environment. '+
                'Your goal is to move the ship from the green rectangle to the blue rectangle as many times as possible, while keeping the ship inside either a blue or a green rectangle.</p>'+
                '<p style="text-align: center"><img src="g.png" style="width: 305px; height: 305px; padding-left: 1.0em; "></p>'
               );
    case 1:
        return ('<h3>Where to Pilot your Spaceship</h3>'+
                '<p>Your Spaceship will start in a green rectangle.</p>'+
                '<p>You should try to pilot the ship into the blue rectangle, while ensuring that the Spaceship always remains in either the green or the blue rectangle.</p>'+
                '<p>If you succeed in entering the blue rectangle, the blue rectangle will turn green, and another blue rectangle will appear at the end of the green (formerly blue) rectangle.</p>'+
                '<p>You gain points for entering blue rectangles.  To maximize your earnings, move the ship from the green rectangle to the blue rectangle as quickly as possible.</p>'+
                '<h3>Colliding with Rectangles</h3>'+
                '<p>Take care to keep the ship inside of the rectangles.  If the ship collides with the border of a rectangle, it will explode.  When the Spaceship explodes, you lose points and are given a new Spaceship to pilot.</p>'+
                '<h3>How to Pilot your Spaceship</h3>'+
                '<p>At the beginning of the game, the ship is moving to the right and is pointing towards the right.  You can turn the ship to make it point in a different direction.'+
                '<ul><li>To turn the ship counterclockwise, press the <strong>A</strong> key.</li>'+
                '<li>To turn the ship clockwise, press the <strong>D</strong> key.</li></ul></p>'+
                '<p>To avoid collisions and enter new rectangles, you will need to change the ship’s direction of motion.  To accelerate your ship in the direction it is pointing—press the <strong>W</strong> key.</p>');
    case 2:
        return ('<h3>How to Pilot your Spaceship (continued)</h3>'+
                '<p>Since you can only accelerate in the direction the ship is pointing, you will usually need to make a turn before you accelerate.</p>'+
                '<p>It is important to understand that because the ship is frictionless, if a ship starts going in a direction, it will continue going in that direction until it is'+
                ' pulled away.  Thus, to change the ship’s direction of motion, you need to both pull it away from its current direction of motion and pull it towards where you want to go.'+
                '  You can do this by pointing the ship in a direction that is in between pointing where you want to go and pointing away from the direction you are currently moving, as illustrated in the diagram below. '+
                '<br><hr><p style="text-align: center"><img src="thrust-illustration.svg" style="width: 580px; height: 300px; padding-left: 1.0em; "></p>');
    case 3:
        return ('<h3>Points</h3>'+
                'You can monitor the total amount of points you have earned by looking at the box labelled PNTS.  Points are awarded or deducted as follows:'+
                '<ul>'+
                '<li>Entering a blue rectangle: +20 points'+
	              '<li>Ship explosion: -100 points'+
                '</ul>'+
                'At no point in the game can you score less than zero points.'+
                '<h3>Bonus Money</h3>'+
                'Bonus compensation starts at zero and increases by 0.06 cents for each point earned in a game.  The total amount you earn in a game cannot be greater than 60 cents or less than 0 cents.  To illustrate the rate of earnings:'+
                '<ul><li>If you earn 800 points in one game, your bonus will increase by 48 cents.'+
                '<li>Earning 100 additional points in a game increases your bonus by 6 cents'+
	        '<li>If you earn 500 points on average for each of the 20 games, your total bonus will be $6.00.'+
                '<li>The total bonus you earn across all 20 games cannot be less than zero dollars and cannot be more than $12.'+
	        '</ul><p>To maximize your bonus you must earn at least <b>1000 points</b> in each game.');
    default:
        return '';
    }
}

function createScreens() {

    var screens = [];
    var config = new RectangleConfig();
    var numGames = config.num_games;
    var i,j;
    var VAQuestions = createVAQuestions(vaqAddends);

    //screens.push(new MessageScreen('<h1>Thanks!</h1>' +
    //                               '<p>We just have a few follow-up questions for you about the games you played.'));
    screens.push(new Consent(consent_html(true)));
    screens.push(new DemographicSurvey());

    screens.push(new Instructions(getInstructions, 4));

    //screens.push(new SoundCheck());

    for (i=0; i<numGames; i++) {

        var g = new Game(config, i+1);
        // var sd = new StoreGameDataScreen(g, i);
        var s = new ScoreScreen(i);
        var n = i+1;
        screens.push(new GameStartScreen('<h1>Game '+n.toString()+' of '+numGames.toString()+'</h1>' +
                                         '<div style="text-align: center; padding: 30px 0 0 0; position: relative;">'+
                                         '<div class="instr"><span class="keyblock">W</span><br><span class="keyinstr">Thrust</span></div>'+
                                         '<div class="instr"><span class="keyblock">A</span><br><span class="keyinstr">Turn Counterclockwise</span></div>'+
                                         '<div class="instr"><span class="keyblock">D</span><br><span class="keyinstr">Turn Clockwise</span></div></div>'+
                                         '<p>Games are 3 minutes long.'+
                                         '<p>To review the instructions, click <a id="instructionslink" href="#">here</a>.'+
                                         '<p>When you are ready to start the game, press ENTER.',
                                         getInstructions, 4));
        screens.push(g);
        // screens.push(sd);
        //screens.push(s); //Commented out by me
    }

    screens.push(getSituationInstructionScreen(config));
    for (j=0; j < SituationQtns.length; j++) {

      screens.push(new Situation(config,SituationQtns[j],j+1,SituationQtns.length,true));
    }

    screens.push(getVectorAdditionInstructionScreen());

    for (j=0; j < VAQuestions.length; j++) {
      screens.push(new vectorAdditionQuestion(VAQuestions[j],j+1,VAQuestions.length));
    }

    screens.push(new MessageScreen('<h1>Thanks!</h1>' +
                                   '<p>We just have a few follow-up questions for you about the games you played.'));
    screens.push(new GameQuestions());
    screens.push(new Feedback());
    screens.push(new End());

    return screens;
}

function showNoAudio() {
    $('#experiment_area').html('<div class="message-container"><div class="message-body">'+
                               '<h2>Your browser does not support audio playback</h2>'+
                               '<p>This study uses sound effects for in-game events.<p>Please load this HIT in a different browser such as the latest version of: Chrome, Firefox, or Safari.'+
                              '</div></div>');
}

function showPreview() {
    $('#experiment_area').html(consent_html(false));
}

function showLoadingScreen() {
    $('#experiment_area').html('<div class="loading">' +
                               '<div class="loadingline">Loading...Please Wait.</div>' +
                               '</div>');
}

function showRejectScreen(body) {
    $('#experiment_area').html('<div class="reject-container">' +
                               '<div class="reject-body">' +
                               body +
                               '</div>' +
                               '</div>');
}

function resumeErrorCallback (text) {
    $('#experiment_area').html('<div class="survey">' +
                               '<div class="question">Oops! Something went wrong. Reloading the page may help. If it doesn\'t please report this problem.</div>' +
                               '<div class="error" id="errorPageError">'+text+'</div>' +
                               '</div>');
}

function rejectExperimentCallback (reason) {
    if (reason === 'assignment-mismatch') {
        showRejectScreen('<h3>Please return the HIT</h3><p>Our records show that you have already participated in this study.');
    } else {
        showRejectScreen('<h3>Please return the HIT</h3><p>Our records show that you have already participated in a similar study.');
    }
}

function resumeExperimentCallback (idx, condition, reward, game_reward, game_points, rect_width, rect_length) {
    exp = new Experiment();
    exp.screens = createScreens();
    exp.reward = reward;
    exp.gameReward = game_reward;
    exp.gamePoints = game_points;
    exp.rect_width = rect_width;
    exp.rect_length = rect_length;
    exp.condition = condition;
    exp.resume(idx);
}

function startExperimentCallback () {
    exp = new Experiment();
    exp.screens = createScreens();
    exp.start();
}

var sounds = {};

function load_audio() {
    // $('#fire_missile').trigger('load');
    // $('#fire_shell').trigger('load');
    // $('#vlner_reset').trigger('load');

    sounds['fire-missile'] = new Howl({urls: ['sound/missile-fired.wav',
                                              'sound/missile-fired.mp3']});
    sounds['fire-shell'] = new Howl({urls: ['sound/shell-fired.wav',
                                            'sound/shell-fired.mp3']});
    sounds['vlner-reset'] = new Howl({urls: ['sound/vlner-reset.wav',
                                            'sound/vlner-reset.mp3']});
    sounds['explosion'] = new Howl({urls: ['sound/explosion.wav',
                                           'sound/explosion.mp3']});
}

function main () {
    if (getAssignmentId() && getHitId() && getWorkerId()) {
        disable_backspace();
        //load_audio();
        fillInForm();
        //if (Howler.noAudio) {
        //    showNoAudio();
        //} else {
            showLoadingScreen();
            getResume(resumeExperimentCallback, startExperimentCallback, rejectExperimentCallback, resumeErrorCallback);
            if (isDebugMode()) {
                $(document).on('keydown', skipAround);
            }
        //}
    } else {
        showPreview();
    }
}
