function SoundCheck () {
    this.screen_id = 'SoundCheck';
    this.soundCount = 0;
    this.delay = 500;

    return this;
}

SoundCheck.prototype = {};

SoundCheck.prototype.init = function () {
    $('#experiment_area').html('<div class="full-message-body">'+
                               '<div class="message-text">'+
                               '<h1>Sound Check!</h1>'+
                               '<p>Space Fortress uses sounds for in-game events such as the fortress firing a shell.'+
                               '<p>The task on this page will ensure that you can hear the game\'s sounds.'+
                               '<p>Click the button to play a sequence of sounds. When the sequence finishes, click the button corresponding to the number of sounds you heard.'+
                               '<p>If you guess correctly, you\'ll be taken to the next screen.' +
                               '<p style="text-align: center"><input id="playsound" type="button" value="Play sounds"/>'+
                               '<div id="button_area" style="text-align: center"></div>'+
                              '</div></div>');

    $('#playsound').on('click', $.proxy(this.playSounds, this));
    exp.lg('start');
};

SoundCheck.prototype.playSounds = function () {
    var i;
    var time = this.delay;

    $('#button_area').html('');

    exp.stopAllTimeouts();
    this.soundCount = Math.floor(Math.random()*7+3);

    for (i=0; i<this.soundCount; i++) {
        // console.log('go', i, time);
        exp.startTimeout(time, $.proxy(this.playRandom, this));
        time += this.delay;
    }

    exp.startTimeout(time, $.proxy(this.insertButtons, this));
    exp.lg('play-sounds', {'num': this.soundCount});
};

SoundCheck.prototype.play = function (id) {
    // console.log('play', id);
    $(id).prop('currentTime', 0);
    $(id).trigger('play');
};

SoundCheck.prototype.playRandom = function () {
    // console.log('play randam');
    var r = Math.floor(Math.random()*3);
    switch (r) {
    case 0:
        sounds['fire-missile'].play();
        // this.play('#fire_missile');
        break;
    case 1:
        sounds['fire-shell'].play();
        // this.play('#fire_shell');
        break;
    case 2:
        sounds['vlner-reset'].play();
        // this.play('#vlner_reset');
        break;
    case 3:
        sounds['explosion'].play();
        // this.play('#vlner_reset');
        break;
    default:
        break;
    }
    exp.lg('sound', {'i': r});
};

SoundCheck.prototype.insertButtons = function () {
    $('#button_area').html('<p>How many sounds did you hear?'+
                           '<p><input type="button" value="1">'+
                           '<input type="button" value="2">'+
                           '<input type="button" value="3">'+
                           '<input type="button" value="4">'+
                           '<input type="button" value="5">'+
                           '<input type="button" value="6">'+
                           '<input type="button" value="7">'+
                           '<input type="button" value="8">'+
                           '<input type="button" value="9">'+
                           '<input type="button" value="10">');

    $('#button_area input[type=button]').on('click', $.proxy(this.countSounds, this));
    exp.lg('show-buttons');
};

SoundCheck.prototype.countSounds = function (ev) {
    var count = $(ev.target).val();
    var correct = this.soundCount == count;

    if (correct) {
        $('#button_area').html('<p>Correct!');
        exp.startTimeout(750, $.proxy(this.onward, this));
    } else {
        $('#button_area').html('<p>Try Again!');
    }
    exp.lg('choose', {'i': count, 'correct': correct});
};


SoundCheck.prototype.onward = function () {
    exp.nextScreen();
};

SoundCheck.prototype.cleanup = function () {
    exp.lg('end');
};
