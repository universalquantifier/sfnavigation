var vaqAddends = [{X:{x:1,y:0},Y:{x:-0.5,y:0}},
{X:{x:0.707,y:0.707},Y:{x:-0.707,y:0.707}},{X:{x:1,y:0},Y:{x:0.5,y:0.866}},
{X:{x:-1,y:0},Y:{x:0.707,y:0.707}},{X:{x:1,y:0},Y:{x:0,y:1}},
{X:{x:0.5,y:0.5},Y:{x:0,y:1}},{X:{x:0.5,y:0.5},Y:{x:-0.866,y:0.5}}];

//speed = starting speed, blue = angle of blue rectangle, ship = angle of ship
var SituationQtns =
  [{A:{speed:1, blue: 35, ship: 90}, B:{speed:1, blue: 35, ship: 60}, tag: 0, change: 0},
   {A:{speed:1, blue: 35, ship: 125}, B:{speed:1, blue: 35, ship: 155}, tag: 0, change: 0},
   {A:{speed:1, blue: 100, ship: 165}, B:{speed:1, blue: 100, ship: 130}, tag: 0, change: 0},
   {A:{speed:1, blue: 35, ship: 95}, B:{speed:1, blue: 35, ship: 125}, tag: 1, change: 1},
   {A:{speed:1, blue: 35, ship: 125}, B:{speed:1, blue: 35, ship: 155}, tag: 1, change: 0},
   {A:{speed:1, blue: 100, ship: 130}, B:{speed:1, blue: 100, ship: 165}, tag: 1, change: 0},
   {A:{speed:1, blue: 45, ship: 90}, B:{speed:1, blue: 45, ship: 180}, tag: 2, change: 1},
   {A:{speed:1, blue: 90, ship: 125}, B:{speed:1, blue: 90, ship: 210}, tag: 2, change: 0},
   {A:{speed:1, blue: 135, ship: 165}, B:{speed:1, blue: 135, ship: 110}, tag: 2, change: 0},
   {A:{speed:1, blue: 45, ship: 90}, B:{speed:2, blue: 45, ship: 90}, tag: 0, change: 1},
   {A:{speed:1, blue: 100, ship: 125}, B:{speed:2.5, blue: 100, ship: 125}, tag: 0, change: 0},
   {A:{speed:2, blue: 45, ship: 110}, B:{speed:1, blue: 45, ship: 110}, tag: 1, change: 1},
   {A:{speed:2, blue: 100, ship: 145}, B:{speed:1, blue: 100, ship: 145}, tag: 1, change: 0},
   {A:{speed:1, blue: 40, ship: 80}, B:{speed:1, blue: 60, ship: 80}, tag: 0, change: 1},
   {A:{speed:1, blue: 35, ship: 125}, B:{speed:1, blue: 75, ship: 125}, tag: 0, change: 0},
   {A:{speed:1, blue: 35, ship: 155}, B:{speed:1, blue: 65, ship: 155}, tag: 0, change: 0},
   {A:{speed:1, blue: 55, ship: 75}, B:{speed:1, blue: 30, ship: 75}, tag: 1, change: 1},
   {A:{speed:1, blue: 25, ship: 145}, B:{speed:1, blue: 55, ship: 145}, tag: 1, change: 0},
   {A:{speed:1, blue: 100, ship: 145}, B:{speed:1, blue: 55, ship: 145}, tag: 1, change: 0}]

var situation_common_prompt = '<p>Both ships are currently moving along the center of the green rectangle. '
          +' They have both begun to thrust, and will continue to thrust until they'
          +' are moving parallel to the (long side of the) blue rectangle.</p>';

var tags = new Array(3);

tags[0] = '<p>Which ship will have to thrust the least to move parallel to the blue '
          +'rectangle?</p>';

tags[1] = '<p>Which ship will <strong>be moving faster when it has thrust enough</strong> to move '
          +'parallel to the blue rectangle?</p>';

tags[2] = 'Which ship can move parallel to the blue rectangle with a single thrust in '
          +'the direction it is pointing?  In other words, <strong>avoid</strong> selecting the ship that '
          +'cannot move parallel to the blue rectangle unless it thrusts in a different direction.';

var vaqDemo = {X:{x:1,y:0},Y:{x:0.5,y:0},
answers:[{x:1,y:0},{x:0.5,y:1},{x:1,y:0.5},{x:1.5,y:0}],right:'D'};

var SituationDemo = {A:{speed:2, blue: 45, ship: 90}, B:{speed:1, blue: 45, ship: 90}, tag: 0};

//Helpful polyfill provided by Mozilla
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
if (typeof Object.create != 'function') {
  Object.create = (function(undefined) {
    var Temp = function() {};
    return function (prototype, propertiesObject) {
      if(prototype !== Object(prototype) && prototype !== null) {
        throw TypeError('Argument must be an object, or null');
      }
      Temp.prototype = prototype || {};
      var result = new Temp();
      Temp.prototype = null;
      if (propertiesObject !== undefined) {
        Object.defineProperties(result, propertiesObject);
      }

      // to imitate the case of Object.create(null)
      if(prototype === null) {
         result.__proto__ = null;
      }
      return result;
    };
  })();
}

function createVAQuestions(addends) {

  var i = 0;
  var questions = new Array(addends.length);
  var answers,badScale,right,delta1,delta2;

  function permuteArray(arr) {
    var i = 0;
    function swap(a,i,j) {
      var temp = a[i];
      a[i] = a[j];
      a[j] = temp;
    }

    for (; i < arr.length; i++) {
      var idx = Math.floor(Math.random()*arr.length);
      swap(arr,i,idx);
    }
  }

  function getCoordinatePerturbation() {
    var sign = 1-2*Math.floor(2*Math.random());
    return sign*(0.25+0.15*Math.random());
  }

  for (; i < addends.length; i++) {
    questions[i] = {};
    questions[i].X = V(addends[i].X.x,addends[i].X.y); questions[i].Y = V(addends[i].Y.x,addends[i].Y.y);
    questions[i].answers = new Array(4);
    right = questions[i].X.duplicate().add(questions[i].Y);
    delta1 = getCoordinatePerturbation();
    delta2 = getCoordinatePerturbation();
    delta2 = delta2+right.y < 0 ? -delta2 : delta2;

    questions[i].answers[0] = right.duplicate();
    questions[i].answers[1] = V(right.x+delta1,right.y+delta2);
    questions[i].answers[2] = V(right.x+delta1,right.y);
    questions[i].answers[3] = V(right.x,right.y+delta2);

    permuteArray(questions[i].answers);
  }

  return questions;
}

function StdScreen() {

  this.buttonName = 'Submit';
  this.title = 'Title undefined';
  this.body = 'Body undefined';
  this.height = '680px';
  this.submitEnabled = true;
}

StdScreen.prototype = {};

StdScreen.prototype.html = function(body) {
  var header = '<div class="card"><div class="main-header">'+this.title
    +'</div><div id="status" class="info"></div><hr class="sf-hr">';
  var submit =  '<div class="footer-continue-area"><span class="sfbutton" id="submit" tabindex="0">'
      +this.buttonName+'</span></div></div>';
  return header+body+submit;
}

StdScreen.prototype.notify = function(status) {
  $('#status').attr({"class":"info"});
  $('#status').html('<span class="glyphicon glyphicon-info-sign" style="vertical-align : middle;"></span>'+'<span style="vertical-align : middle;">'+status+'</span>');
}

StdScreen.prototype.warn = function(status) {
  $('#status').attr({"class":"error info"});
  $('#status').html('<span class="glyphicon glyphicon-warning-sign" style="vertical-align : middle;"></span>'+'<span style="vertical-align : middle;">'+status+'</span>');
}

StdScreen.prototype.noStatusBar = function() {
  $('#status').attr({"class":"noDisplay"});
  $('#status').html('');
}

StdScreen.prototype.hideStatusBar = function() {
  $('#status').css({"visibility":"hidden"});
  $('#status').html('');
}

StdScreen.prototype.validate = function() { return true; };

StdScreen.prototype.enableSubmit = function() { this.submitEnabled = true; };
StdScreen.prototype.disableSubmit = function() { this.submitEnabled = false; };

StdScreen.prototype.init = function() {
  var self = this;
  $("#experiment_area").html(this.html(this.body));
  $('.card').css({"height": this.height});
  $('#submit').click(function(){
    if (self.submitEnabled && self.validate()) {
      exp.nextScreen();
    }
  });
  $('#submit').keydown(function(event){
    if (event.which == 13 && self.submitEnabled) {
      if (self.validate()) {
        exp.nextScreen();
      }
    }
  });
}

StdScreen.prototype.cleanup = function() {};

function Situation(config, question, qnum, num_questions, randomize_order) {
    StdScreen.call(this);

    this.left = 'A', this.right = 'B';
    if (randomize_order && Math.random() > 0.5) {
      this.left = 'B'; this.right = 'A';
    }

    this.question_num = qnum;
    this.question = question;

    this.ship1 = this.getShip(config,question[this.left].ship, question[this.left].speed);
    this.ship2 = this.getShip(config,question[this.right].ship, question[this.right].speed);

    this.segment1 = this.getFirstSegment(config);
    this.next_segment1 =
      this.getSuccessorSegment(this.segment1, deg2rad(question[this.left].blue), config);

    this.segment2 = this.getFirstSegment(config);
    this.next_segment2 =
      this.getSuccessorSegment(this.segment2, deg2rad(question[this.right].blue), config);

    this.selected = undefined;
    this.title = 'SET 1 : QUESTION ' + qnum + '/' + num_questions;
    this.instructions = tags[question.tag];
    this.begin_status = 'Please read the following instructions carefully.';
    if (question['change']) {
      this.begin_status = '<strong>The instructions have changed from the last question.</strong>'
    }
    this.nochoice_status = '<strong>You must choose an answer before you can continue.</strong>';
    this.corrected_status = 'Press submit when you have finalized your choice.';
    this.body = '<div class="message-text">' + situation_common_prompt
      +'<div id="situation-container">' + '<canvas class="unselected" id="left-screen-canvas" width="300px" height="300px"></canvas>'
      +'<canvas class="unselected" id="right-screen-canvas" width="300px" height="300px"></canvas></div>'
      + tags[question.tag] + '</div>';

    return this;
}

Situation.prototype = Object.create(StdScreen.prototype);

Situation.prototype.getSegmentLength = function(config) {
  var half_width = config.survey_rect_width/2;
  var min_angle = config.min_angle;
  var max_angle = config.max_angle;
  var maximizing_angle = deg2rad(Math.min(Math.abs(min_angle), Math.abs(180-max_angle)));
  return half_width*1.8*(1/Math.tan(maximizing_angle))*(1+1/Math.cos(maximizing_angle));
}

Situation.prototype.getFirstSegment = function(config) {
  var half_width = config.survey_rect_width/2;
  var rect_length = this.getSegmentLength(config);
  var pos = V(150,300-half_width-20);
  return new Segment(pos.duplicate().sub(V(rect_length,0)),pos,half_width,false);
}

Situation.prototype.getSuccessorSegment = function(last_segment,angle,config) {
  var half_width = config.survey_rect_width/2;
  var rect_length = this.getSegmentLength(config);
  var begin = last_segment.end.duplicate();
  var old_dir = last_segment.direction();
  var theta = Math.atan2(old_dir.y,old_dir.x);
  var diff_x = rect_length*Math.cos(-angle+theta);
  var diff_y = rect_length*Math.sin(-angle+theta);
  var end = begin.duplicate().add(V(diff_x,diff_y));
  return new Segment(begin,end,half_width,true);
}

Situation.prototype.getShip = function(config, angle, speed) {
  var half_width = config.survey_rect_width/2;
  var pos = V(150,300-half_width-20);
  var ship = new Ship(config);
  ship.position = pos;
  ship.angle = angle;
  ship.velocity = V(1,0).scalar_mult(speed);
  return ship;
}

Situation.prototype.init = function() {
  var situationObject = this;
  StdScreen.prototype.init.call(this);
  this.notify(this.begin_status);

  this.canvasL = document.getElementById('left-screen-canvas').getContext('2d');
  this.canvasR = document.getElementById('right-screen-canvas').getContext('2d');

  this.canvasL.lineWidth = 1.4;
  this.canvasR.lineWidth = 1.4;

  this.render();

  $('#left-screen-canvas').click(function(){
    situationObject.selected = situationObject.left;
    $("#left-screen-canvas").attr({"class":"selected"});
    $("#right-screen-canvas").attr({"class":"unselected"});
    if (situationObject.errStatus === 'noChoiceMade') {
      situationObject.errStatus = '';
      situationObject.notify(situationObject.corrected_status);
    }
  });

  $('#right-screen-canvas').click(function(){
    situationObject.selected = situationObject.right;
    $("#left-screen-canvas").attr({"class":"unselected"});
    $("#right-screen-canvas").attr({"class":"selected"});
    if (situationObject.errStatus === 'noChoiceMade') {
      situationObject.errStatus = '';
      situationObject.notify(situationObject.corrected_status);
    }
  });

};

Situation.prototype.validate = function() {

  if (this.selected === undefined) {
    this.warn(this.nochoice_status);
    this.errStatus = 'noChoiceMade';
    return false;
  } else if (this.correct !== undefined && this.correct !== this.selected) {
    this.warn(this.incorrect_status);
    return false;
  }

  return true;

}

Situation.prototype.render = function () {

  var renderExhaust2 = function(ship,canvas,tick) {

    var period = 8;
    var nparticles = 8;
    var period_vector = V(-period*ship.velocity.x,period*ship.velocity.y);
    var timeIdx = mod(tick, period);
    var offset = period_vector.duplicate().scalar_mult(timeIdx/period).add(ship.position);

    for (var i = 0; i < nparticles; i++) {
      var weight = Math.round(255*(1-(i*period+timeIdx)/(period*nparticles)));
      canvas.fillStyle = 'rgb('+weight+','+weight+','+weight+')';
      canvas.beginPath();
      canvas.arc(offset.x,offset.y,2,0,2*Math.PI,false);
      canvas.fill();
      offset.add(period_vector);
    }

    canvas.restore();
  };
  var renderExhaust = function(ship,canvas) {
    var arr_length_div_speed = 30;
    var delta = ship.velocity.duplicate().scalar_mult(arr_length_div_speed);
    var v0 = ship.position.duplicate().sub(delta);
    var l = delta.norm();
    var head_perp_length = l/6;
    var head_par_length = l/6;
    var theta = Math.atan2(delta.y,delta.x);
    var arrowWireframe = new Wireframe([[0,0],[l,0],[6*l/11,0],[6*l/11-head_par_length,-head_perp_length],[6*l/11-head_par_length,head_perp_length]],
                           [[0,1],[3,2,4]],"#FFFFFF");
    arrowWireframe.draw(canvas,v0.x,v0.y,theta);
  };

  function renderHelper(canvas, ship, segment, segment2) {
    canvas.clearRect(0, 0, 300, 300);
    renderExhaust(ship,canvas);
    ship.draw(canvas);
    segment.draw(canvas);
    segment2.draw(canvas);
  }

  renderHelper(this.canvasL,this.ship1,this.segment1,this.next_segment1);
  renderHelper(this.canvasR,this.ship2,this.segment2,this.next_segment2);

};

Situation.prototype.tick = function() {

    this.render();
    this.exhaust_tick++;
};

Situation.prototype.cleanup = function() {
  exp.lg('end', {'question_type' : 'gamePhysics',
                 'questionNumber': this.question_num,
                 'answer' : this.selected,
                 'question' : this.question });
};

function vectorAdditionQuestion(question,num,outOf) {
  StdScreen.call(this);
  this.x = question.X;
  this.y = question.Y;

  this.answerA = question.answers[0];
  this.answerB = question.answers[1];
  this.answerC = question.answers[2];
  this.answerD = question.answers[3];
  this.answers = ['A','B','C','D'];
  this.question_num = num;

  this.title = 'SET 2 : QUESTION '+num+'/'+outOf;
  this.instructions = '<p>Click the vector on the right that represents the sum of the two vectors on the left.</p>';
  this.selected = undefined;
  this.begin_status = 'Please read the following instructions carefully before making your choice.';
  this.nochoice_status = 'You must choose an answer before you can continue.</strong>';
  this.corrected_status = 'Press submit when you have finalized your choice.';

  this.body = '<div class="message-text">'+this.instructions+'</div><div id="vaq-container">'
  +'<canvas class="vaq-canvas selected-small" id="vaq-addendX"></canvas>'
  +'<span class="vaq-iconic-font" id="vaq-plus">+</span>'
  +'<canvas class="vaq-canvas selected-small" id="vaq-addendY"></canvas>'
  +'<span class="vaq-iconic-font" id="vaq-equals">&#61;</span>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerA"></canvas>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerC"></canvas>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerB"></canvas>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerD"></canvas></div>';
}

//Want vectorAdditionQuestion prototype to inherit from StdScreen prototype
vectorAdditionQuestion.prototype = Object.create(StdScreen.prototype);

function answerOption(canvas,vec,id) {
  this.canvas = canvas;
  canvas.lineWidth = 1.4;
  this.selected = false;
  this.vec = vec;
  this.id = id;
  this.scale = 60; //Number of pixels per vector unit
  this.size = this.getMinSize();
}

answerOption.prototype.getMinSize = function() {
  return this.scale*Math.max(Math.abs(this.vec.x),Math.abs(this.vec.y))+34;
}

answerOption.prototype.setSize = function(s) {
  this.size = s;
  $(this.id).css({"width":""+s,"height":""+s})
  $(this.id).attr({"width":""+(s-4),"height":""+(s-4)});
}

answerOption.prototype.draw = function() {
  var drawVector = function(canvas,delta,head_par_length,head_perp_length,color) {
    var v0 = V(15,canvas.canvas.width-15);
    if (delta.x < 0) {
      v0 = V(canvas.canvas.width-15,canvas.canvas.width-15);
    }

    var l = delta.norm();
    var theta = Math.atan2(delta.y,delta.x);
    var p = 0.30;
    var arrrowWireframe = new Wireframe([[0,-head_par_length*p],
                                        [l-head_par_length,-head_par_length*p],
                                        [l-head_par_length,-head_perp_length],
                                        [l,0],
                                        [l-head_par_length,head_perp_length],
                                        [l-head_par_length,head_par_length*p],
                                        [0,head_par_length*p]],
                           [[0,1,2,3,4,5,6]],color,true);
    arrrowWireframe.draw(canvas,v0.x,v0.y,rad2deg(theta));
    canvas.fillStyle = color;
    canvas.fill();
    canvas.fillStyle = "#000000";
  }
  var color = 'grey';
  if (this.selected) {
    color = '#990000';
  }
  this.canvas.clearRect(0, 0, this.size, this.size);

  drawVector(this.canvas,this.vec.duplicate().scalar_mult(this.scale),10,10,color);
}

vectorAdditionQuestion.prototype.createAnswerOnClick = function(id) {
  var self = this;
  return function(){
    //Unselect all answers
    for (var j = 0; j < self.answers.length; j++) {
      $('#vaq-answer'+self.answers[j]).attr({"class":"vaq-canvas unselected-small"});
      self['vaq-answer'+self.answers[j]].selected = false;
    }

    //Select answer with ID id
    self.selected = id;
    self[id].selected=true;
    $("#"+id).attr({"class":"vaq-canvas selected-small"});

    if (self.errStatus === 'noChoiceMade') {
      self.errStatus = '';
      self.notify(self.corrected_status);
    }
    self.render();
  };
}

vectorAdditionQuestion.prototype.init = function() {

  StdScreen.prototype.init.call(this);
  this.notify(this.begin_status);

  for (var j = 0; j < this.answers.length; j++) {
    var id = 'vaq-answer'+this.answers[j];
    this[id] = new answerOption(document.getElementById(id).getContext('2d'),this['answer'+this.answers[j]],'#'+id);
    $('#'+id).click(this.createAnswerOnClick(id));
  }

  this.addendX = new answerOption(document.getElementById('vaq-addendX').getContext('2d'),this.x,'#vaq-addendX');
  this.addendY = new answerOption(document.getElementById('vaq-addendY').getContext('2d'),this.y,'#vaq-addendY');
  this.addendX.selected = true; this.addendY.selected=true;

  this.generateLayout();
  this.render();

};

vectorAdditionQuestion.prototype.validate = function(){
  if (this.selected === undefined) {
    this.warn(this.nochoice_status);
    this.errStatus = 'noChoiceMade';
    return false;
  } else if (this.correct !== undefined && this.correct !== this.selected) {
    this.warn(this.incorrect_status);
    return false;
  }

  return true;
};

vectorAdditionQuestion.prototype.render = function() {

  this.addendY.draw(); this.addendX.draw();

  for (var j = 0; j < this.answers.length; j++) {
    this['vaq-answer'+this.answers[j]].draw();
  }

}

vectorAdditionQuestion.prototype.generateLayout = function() {

  var self = this;
  var addendSize = Math.max(this.addendX.getMinSize(),this.addendY.getMinSize());
  var maxAnswerSize = this.answers.reduce(function(acc,newVal) {
    return Math.max(acc,self['vaq-answer'+newVal].getMinSize());
  }, 0);
  var pos = {};
  var fontWidth = 36, fontHeight = 67, gridMargin = 14;
  var plusMargin = 15;
  var maxContainerWidth = $('.experiment_area').css('width') - 2*$('.message-text');
  var containerWidth, containerHeight;
  var leftmostAnswerLeft, addendYRight;
    
  pos['addendX'] = {}; pos['addendY'] = {};
  pos['answerA'] = {}; pos['answerB'] = {}; 
  pos['answerC'] = {}; pos['answerD'] = {}; 
  pos['plus'] = {};  pos['equals'] = {};
  
  pos['addendX'].left = 0; pos['plus'].left = this['addendX'].getMinSize()+plusMargin;
  pos['addendY'].left = pos['plus'].left+fontWidth+plusMargin;
  pos['answerB'].left = 562;
  pos['answerA'].right = Math.max(this['vaq-answerB'].getMinSize(),this['vaq-answerD'].getMinSize())+gridMargin;
  pos['answerC'].right = pos['answerA'].right; 
  pos['answerD'].left = pos['answerB'].left;
  leftmostAnswerLeft = pos['answerB'].left-gridMargin - Math.max(this['vaq-answerA'].getMinSize(),this['vaq-answerC'].getMinSize());
  addendYRight = pos['addendY'].left+this['addendY'].getMinSize();
  pos['equals'].left = addendYRight+(leftmostAnswerLeft-addendYRight)/2-fontWidth/2;

  containerWidth = pos['answerD'].left+Math.max(this['vaq-answerB'].getMinSize(),this['vaq-answerD'].getMinSize());
  containerHeight = 370;

  pos['addendX'].bottom = (containerHeight-Math.max(this.addendX.getMinSize(),this.addendY.getMinSize()))/2; 
  pos['addendY'].bottom = pos['addendX'].bottom;
  pos['plus'].top = (containerHeight-fontHeight)/2; 
  pos['equals'].top = pos['plus'].top;
  pos['answerA'].top = (containerHeight-gridMargin)/2-this['vaq-answerA'].getMinSize();
  pos['answerB'].top = (containerHeight-gridMargin)/2-this['vaq-answerB'].getMinSize();
  pos['answerC'].top = (containerHeight+gridMargin)/2;
  pos['answerD'].top = pos['answerC'].top;

  var setPosition = function(stub) {
    pos[stub].position = 'absolute';
    $('#vaq-'+stub).css(pos[stub]);
  };

  $('#vaq-container').css({'width':containerWidth,'height':containerHeight});

  setPosition('addendX'); setPosition('addendY');
  setPosition('plus'); setPosition('equals');
  this.answers.forEach(function(v) { setPosition('answer'+v); } );
  this.answers.forEach(function(v) { 
      var answerObj = self['vaq-answer'+v];
      answerObj.setSize(answerObj.getMinSize()); 
  } );
  this.addendX.setSize(this.addendX.getMinSize()); 
  this.addendY.setSize(this.addendY.getMinSize())
}

vectorAdditionQuestion.prototype.cleanup = function() {
  function JSONifyVector(v) { return {'x' : v.x, 'y' : v.y}; };
  var questionObj = {};
  questionObj['addend1'] = JSONifyVector(this.x);
  questionObj['addend2'] = JSONifyVector(this.y);
  for (var j = 0; j < this.answers.length; j++) {
    var id = 'answer'+this.answers[j];
    questionObj[id] = JSONifyVector(this[id]);
  }
  exp.lg('end', {'question_type' : 'vectorAddition',
                 'questionNumber': this.question_num,
                 'answer' : this.selected,
                 'question' : questionObj});
};

function getVectorAdditionInstructionScreen() {
  function vectorCast(v) {return V(v.x,v.y)};
  var demoQuestion = {X:vectorCast(vaqDemo.X),Y:vectorCast(vaqDemo.Y),
    answers:[vectorCast(vaqDemo.answers[0]),vectorCast(vaqDemo.answers[1]),
            vectorCast(vaqDemo.answers[2]),vectorCast(vaqDemo.answers[3])]}
  var screen = new vectorAdditionQuestion(demoQuestion,0,0);
  screen.correct = 'vaq-answer'+vaqDemo.right;
  screen.incorrect_status = 'Your answer is incorrect. Please reconsider your answer.';
  screen.instructions = '<p>For the next set of questions, you will select the vector sum '+
  'of two vectors.  If you do not know what vector addition is, make a random guess.</p>'
  +'<p>To make your answer, click the grey vector on the right that represents'
  +' the vector sum of the two red vectors on the left and press submit.'
  +' You cannot return to previous questions once you press submit.</p>'
  +'<p>To demonstrate the task, a practice question is provided below.  Unlike the '
  +'questions that follow, you cannot advance to the next question until you choose the right'
  +' answer.</p>';
  screen.title = 'SET 2 : INSTRUCTIONS';
  screen.body = '<div class="message-text">'+screen.instructions+'</div><div id="vaq-container">'
  +'<canvas class="vaq-canvas selected-small" id="vaq-addendX"></canvas>'
  +'<span class="vaq-iconic-font" id="vaq-plus">+</span>'
  +'<canvas class="vaq-canvas selected-small" id="vaq-addendY"></canvas>'
  +'<span class="vaq-iconic-font" id="vaq-equals">&#61;</span>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerA"></canvas>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerC"></canvas>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerB"></canvas>'
  +'<canvas class="vaq-canvas unselected-small" id="vaq-answerD"></canvas></div>';

  return screen;
};

function getSituationInstructionScreen(config) {
  var screen = new Situation(config,SituationDemo,0,0,false);
  screen.correct = 'A';
  screen.begin_status = 'Below are instructions for the next task.';
  screen.incorrect_status = 'Your answer is incorrect. Please reconsider your answer.';
  screen.instructions = '<p>The following set of questions will test your knowledge of the '
    +'physics of the game you just played.  You will compare two hypothetical '
    +'game situations where a thrust is about to be made.  Both ships thrust at the same '
    +'point in the green rectangle, attempting to change course to move parallel'
    +' to the blue rectangle.  Depending on the situation, the ships may have '
    +'different speeds or thrust angles, or potentially be trying to change '
    +'course to different blue rectangles.  You will need to use your imagination'
    +' and intuition from your past gameplay experiences to answer the questions.'
    +' </p><p>The white arrows behind the ships represent their speed before they '
    +'begin to thrust.  A longer arrow corresponds to a faster speed.  To answer '
    +'the questions, you will only need to know the speeds of the ships relative'
    +' to each other, not exact speed values.</p><p>To continue on to the '
    +'questions, click on the situation where the ship is going the fastest and '
    +'press submit.</p>';
  screen.title = 'SET 1 : INSTRUCTIONS';
  screen.body = '<div class="message-text">'+screen.instructions
    +'<div id="situation-container">' + '<canvas class="unselected" id="left-screen-canvas" width="300px" height="300px"></canvas>'
    +'<canvas class="unselected" id="right-screen-canvas" width="300px" height="300px"></canvas></div></div>';
  screen.height = '750px';
  return screen;
};
