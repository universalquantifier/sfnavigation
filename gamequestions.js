// How did you decide when to thrust? What did you pay attention to?
// How did you decide what angle to thrust at when making turns?

// Do you have any comments on the design of the game or the questions?

function GameQuestions() {
    StdScreen.call(this);
    this.screen_id = "GameQuestions";
    this.timeout = 1000;
    this.title = "POST-TASK SURVEY : 1/2"
    this.body = '<div class="message-text">'+
                 // '<div class="feedback-header">Feedback Page 1 of 2</div>'+
                 '<div style="display: inline-block; padding-top: 0px; border-spacing: 10px 1px; width: 700px;">'+
                 this.questionRow('timing', 'When playing the games, how did you decide when to thrust? What did you pay attention to?') +
                 this.questionRow('angle', 'How did you decide what angle to thrust at when making turns?') +
                 this.questionRow('difficulties', 'What aspects of the game did you find challenging?') +
                 '</div></div>';
    this.begin_status = 'Please answer the following questions.';
    return this;
}

GameQuestions.prototype = Object.create(StdScreen.prototype);;

GameQuestions.prototype.question = function (num, name, text) {
    var base = name+num.toString();
    var ret = ('<div class="gq-question"><div class="gq-boxheader">'+text+' <span id="'+base+'Warning" class="warning">Required</span></div>'+
               '<p><textarea name="'+base+'" rows="4" style="width: 100%"></textarea>'+
              '</div>')
    return ret;
};

GameQuestions.prototype.questionRow = function (name, text) {
    var ret = (this.question(1, name, text) /* + this.question(2, name, text) + */);
    return ret;
};

GameQuestions.prototype.init = function () {
    StdScreen.prototype.init.call(this);
    this.notify(this.begin_status);
    $('#submit')
        .prop('disabled', true);
    exp.startTimeout(this.timeout, $.proxy(this.enableContinue, this));
    exp.lg('start');
};

GameQuestions.prototype.check = function () {
    var canGo = (surveyHelper.textareaFilled('timing1') &&
                 //surveyHelper.textareaFilled('attention2') &&
                 surveyHelper.textareaFilled('angle1') &&
                 //surveyHelper.textareaFilled('thrust2') &&
                 surveyHelper.textareaFilled('difficulties1'));//&&
                 //surveyHelper.textareaFilled('vlner2')) &&
                 //surveyHelper.oneChecked('priority1') &&
                 //surveyHelper.oneChecked('priority2');

    //surveyHelper.simpleShowWarning('priority1');
    //surveyHelper.simpleShowWarning('priority2');
    surveyHelper.showWarning('timing1', surveyHelper.textareaFilled('timing1'));
    //surveyHelper.showWarning('attention2', surveyHelper.textareaFilled('attention2'));
    surveyHelper.showWarning('angle1', surveyHelper.textareaFilled('angle1'));
    //surveyHelper.showWarning('thrust2', surveyHelper.textareaFilled('thrust2'));
    surveyHelper.showWarning('difficulties1', surveyHelper.textareaFilled('difficulties1'));
    //surveyHelper.showWarning('vlner2', surveyHelper.textareaFilled('vlner2'));

    return canGo;
};

GameQuestions.prototype.enableContinue = function () {
    $('#gamequestions-button').prop('disabled', false);
};

GameQuestions.prototype.validate = function () {
    if (this.check()) {
        exp.lg('end', {'survey': surveyHelper.getInputValues('#experiment_area :input')});
        return true;
    } else {
        this.warn("Please correct the following errors then click Continue.");
    }
};
