function Feedback() {
    StdScreen.call(this);
    this.screen_id = "Feedback";
    this.timeout = 1000;
    this.title = 'POST-TASK SURVEY : 2/2'
    return this;
}

Feedback.prototype = Object.create(StdScreen.prototype);

Feedback.prototype.init = function () {
    this.body =  '<div class="message-body">'+

       // '<div class="feedback-header">Feedback Page 2 of 2</div>'+

       '<div class="gq-question">Have you played a game which had physics similar to the game in the experiment (i.e. controlling an object in a frictionless space)? <span id="playedbeforeWarning" class="warning">Required</span><p>'+
       '<label><input type="radio" name="playedbefore" value="no">No, I haven\'t ever played a game like this before.</label><br>'+
       '<label><input type="radio" name="playedbefore" value="yes">Yes, the name of the similar game is</label> <input type="text" name="game"> <span id="gameWarning" class="warning">Specify</span>'+
       '</div>'+
       '<div class="gq-question">Which of the following physics concepts are you familiar with? Check all that apply.<p>'+
       '<label><input type="checkbox" name="physics" value="addition">Vector Addition</label><br>'+
       '<label><input type="checkbox" name="physics" value="velocity">Velocity & Acceleration</label><br>'+
       '<label><input type="checkbox" name="physics" value="momentum">Conservation of Momentum</label><br>'+
       '</div>'+

       '<div class="gq-question">Please add any comments, questions, and/or recommendations below.'+
       '<p><textarea name="feedback" rows="4" style="width: 100%"></textarea>'+
       '</div></div>';
    StdScreen.prototype.init.call(this);
    this.disableSubmit();
    exp.startTimeout(this.timeout, $.proxy(this.enableSubmit, this));
    exp.lg('start');
};

Feedback.prototype.check = function () {
    var playedFilled = surveyHelper.oneChecked('playedbefore');
    var played = surveyHelper.radioValue('playedbefore') == 'yes';
    var game = $('#experiment_area :input[name=game]').val().length > 0;
    var canGo = (surveyHelper.oneChecked('playedbefore') && (!played || game));

    surveyHelper.simpleShowWarning('playedbefore');
    surveyHelper.showWarning('game', !played || game);

    return canGo;
};

Feedback.prototype.validate = function () {
    if (this.check()) {
        exp.lg('end', {'survey': surveyHelper.getInputValues('#experiment_area :input')});
        return true;
    } else {
        this.warn("Please correct the following errors then click Continue.");
        return false;
    }
};
