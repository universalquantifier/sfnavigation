var COLLIDE_FORTRESS = 1;
var COLLIDE_SHIP = 2;
var COLLIDE_BIGHEX = 3;
var COLLIDE_SMALLHEX = 4;

var KEY_CODES = ['fire',
                 'left',
                 'right',
                 'thrust'];

var EVENT_CODES = ['explode-smallhex',
                   'explode-bighex',
                   'ship-respawn',
                   'fortress-fired',
                   'shell-hit-ship',
                   'missile-fired',
                   'hit-fortress',
                   'fortress-destroyed',
                   'fortress-respawn',
                   'vlner-reset',
                   'vlner-increased',
                   'explode-rectangle',
                   'entering-rectangle',

                   'press-left',
                   'press-right',
                   'press-thrust',
                   'press-fire',
                   'release-left',
                   'release-right',
                   'release-thrust',
                   'release-fire'];

const screen_width = 710;
const screen_height = 600;

function inRange(x,a,b) {
  return a < x && x < b;
}

function deg2rad(deg) {
    return deg * Math.PI / 180;
}

function rad2deg(rad) {
    return rad / Math.PI * 180;
}

function mod(x,y) {
    return ((x%y)+y)%y;
}

function Vector(x,y) {
    Object.call(this);
    this.x = x;
    this.y = y;
    return this;
}

function V(x,y) {
    return new Vector(x,y);
}

Vector.prototype = {};

Vector.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

Vector.prototype.sub = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  return this;
}

Vector.prototype.scalar_mult = function(alpha) {
  this.x *= alpha;
  this.y *= alpha;
  return this;
}

Vector.prototype.copy = function (v) {
    this.x = v.x;
    this.y = v.y;
};

Vector.prototype.duplicate = function() {
  return new Vector(this.x,this.y);
}

Vector.prototype.norm = function() {
  return Math.sqrt(Math.pow(this.x,2) + Math.pow(this.y,2));
}

Vector.prototype.normalize = function() {
  var norm = this.norm();
  if (norm > 0) {
    this.x /= norm;
    this.y /= norm;
  }
  return this;
}

function dotProduct (v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
}

function angle_to(v1, v2) {
    var a = Math.atan2(-(v2.y-v1.y),
                       v2.x-v1.x);
    if (a < 0) { a += Math.PI*2; }
    return rad2deg(a);
}

function Timer(time) {
    Object.call(this);
    this.time = time || 0;
    this.last_tick = 0;
    return this;
}

Timer.prototype = {};

Timer.prototype.tick = function (ms) {
    this.time += ms;
    this.last_tick = ms;
};

Timer.prototype.reset = function () {
    this.time = 0;
};

Timer.prototype.elapsed = function () {
    return this.time;
};

function KeyState() {
    Object.call(this);

    this.events = [];
    this.keys = {'left': false,
                 'right': false,
                 'thrust': false,
                 'fire': false};
    return this;
}

KeyState.prototype = {};

KeyState.prototype.press = function (which) {
    this.keys[which] = true;
    this.events.push({'type': 1, 'key': which});
};

KeyState.prototype.release = function (which) {
    this.keys[which] = false;
    this.events.push({'type': 0, 'key': which});
};

KeyState.prototype.clear = function () {
    this.events = [];
};

function Wireframe(points, runs, color, shadows) {
    Object.call(this);
    this.points = points;
    this.runs = runs;
    this.color = color;
    this.shadows = shadows;
    return this;
}

Wireframe.prototype = {};

// Wireframe.prototype.rotate_translate = function (pair, x, y, angle) {
//     return [ pair[0] * Math.cos(angle) - pair[1] * Math.sin(angle) + x,
//             -pair[1] * Math.sin(angle) + pair[1] * Math.cos(angle) + y];
// }

// Wireframe.prototype.translate_run = function (run, x, y, angle) {
//     var i, new_run = [];
//     for (i=0; i<run.length; i++) {
//         new_run[i] = this.rotate_translate(run[i][0]);
//     }
// };

Wireframe.prototype.draw = function (canvas, x, y, angle) {
    var r, i;
    canvas.save();
    canvas.strokeStyle = this.color;
    canvas.translate(x,y);
    canvas.scale(1,-1);
    canvas.rotate(deg2rad(angle));
    if (this.shadows) {
      canvas.shadowOffsetX = 2;
      canvas.shadowOffsetY = 2;
      canvas.shadowBlur = 5;
      canvas.shadowColor = "rgba(0, 0, 0, 0.5)";
    }
    for (r=0; r<this.runs.length; r++) {
        canvas.beginPath();
        canvas.moveTo(this.points[this.runs[r][0]][0], this.points[this.runs[r][0]][1]);
        for (i=1; i<this.runs[r].length; i++) {
            canvas.lineTo(this.points[this.runs[r][i]][0], this.points[this.runs[r][i]][1]);
        }
        canvas.stroke();
    }
    canvas.restore();
};

var shipWireframe = new Wireframe([[-18,0], [18,0], [0,0], [-18,18], [-18,-18]],
                                  [[0,1], [3, 2, 4]],
                                  '#FFFF00');

function Entity() {
    Object.call(this);

    this.position = V(0,0);
    this.velocity = V(0,0);
    this.angle = 0;
    this.collisionRadius = 0;
    this.alive = true;

    return this;
}

Entity.prototype = {};

function collided(e1, e2) {
    var d = Math.sqrt(Math.pow(e1.position.x - e2.position.x, 2) + Math.pow(e1.position.y - e2.position.y, 2));
    return d <= e1.collision_radius + e2.collision_radius;
}

function outside_game_area(e) {
    return e.position.x < 0 || e.position.x > 710 || e.position.y < 0 || e.position.y > 626;
}

function drawExplosion(canvas, x, y) {
    var ofs = 0;
    var radius;
    for (radius=15; radius<70; radius+=8) {
        var angle;
        ofs += 3;
        if (radius < 60) { canvas.strokeStyle = '#FFFF00'; }
        else { canvas.strokeStyle = '#FF0000'; }
        for (angle=0; angle<360; angle += 30) {
            canvas.beginPath();
            canvas.arc(x, y, radius, deg2rad(angle+ofs),deg2rad(angle+ofs+10),false);
            canvas.stroke();
        }
    }
    canvas.strokeStyle = '#FFFF00';
    canvas.beginPath();
    canvas.arc(x, y, 7, 0, Math.PI*2, false);
    canvas.stroke();
}

function Ship(config) {
    Entity.call(this);
    this.startVelocity = V(1,0);
    this.startPosition = V(350,350);
    this.startOrientation = 0;
    this.angle = this.startOrientation;
    this.turn_speed = 6;
    this.acceleration = 0.3;
    this.collision_radius = 10;

    this.position.copy(this.startPosition);
    this.velocity.copy(this.startVelocity);
    this.turn_flag = null;
    this.thrust_flag = false;
    this.deathTimer = new Timer();
    return this;
}

Ship.prototype = new Entity();

Ship.prototype.reset = function () {
    this.alive = true;
    this.position.copy(this.startPosition);
    this.velocity.copy(this.startVelocity);
    this.angle = this.startOrientation;
};

Ship.prototype.draw = function (canvas) {
    if (this.alive) {
        shipWireframe.draw(canvas, this.position.x, this.position.y, this.angle);
    } else {
        drawExplosion(canvas, this.position.x, this.position.y);
    }
};

function Segment(start,end,margin,ghost) {
    Entity.call(this);
    this.start = start;
    this.end = end;
    this.margin = margin;
    this.ghost = ghost;
    return this;
}

Segment.prototype.contains = function(pos) {
    var seg_dir = this.direction();
    var recentered_pos = pos.duplicate().sub(this.start)

    //At start point or close enough to cause roundoff errors?
    if (recentered_pos.norm() <= 0) {
        return true;
    }

    //Project current position onto main segment axis and check it is in bounds
    var par = dotProduct(seg_dir,recentered_pos) / seg_dir.norm();
    if (par < -this.margin || par > (seg_dir.norm()+this.margin)) {
        return false;
    } else {
        //Use Pythagorean theorem to find square of coordinate perpendicular to
        //segment direction
        var perp = Math.pow(recentered_pos.norm(),2) - Math.pow(par,2);
        if (perp > Math.pow(this.margin,2)) {
            return false;
        } else {
            return true;
        }
    }
}

Segment.prototype.copy = function() {
  return new Segment(this.start.duplicate(),this.end.duplicate(),this.margin,this.ghost);
}

Segment.prototype.draw = function(canvas) {
        var seg_dir = this.direction();
        var par = seg_dir.normalize();
        var oldLW = canvas.lineWidth;
        par.scalar_mult(this.margin);

        var normal = V(seg_dir.y,-seg_dir.x);
        normal.normalize();
        normal.scalar_mult(this.margin);

        start1 = this.start.duplicate().add(normal).sub(par);
        start2 = this.start.duplicate().sub(normal).sub(par);
        end1 = this.end.duplicate().add(normal).add(par);
        end2 = this.end.duplicate().sub(normal).add(par);

        if (this.ghost) {
            canvas.strokeStyle = '#0000FF';
        } else {
            canvas.strokeStyle = '#60FF60';
        }
        canvas.lineWidth = 2.4;
        canvas.beginPath();
        canvas.moveTo(start1.x, start1.y);

        canvas.lineTo(end1.x, end1.y);
        canvas.lineTo(end2.x, end2.y);
        canvas.lineTo(start2.x,start2.y);
        canvas.lineTo(start1.x,start1.y); //May not be needed?

        canvas.stroke();
        canvas.lineWidth = oldLW;
}

Segment.prototype.update = function(motion) {
    var vel = new Vector(-motion.x,motion.y)
    this.start.add(vel)
    this.end.add(vel)
}

Segment.prototype.direction = function() {
  var retVal = this.end.duplicate();
  retVal.sub(this.start);
  return retVal;
}

Segment.prototype.width = function() {
  return 2*this.margin;
}

Segment.prototype.length = function() {
  return 2*this.margin+this.direction().norm();
}

/* Suppose we are working with a 'scissor' arrangement of two segments which share
the same start point, the same length, and the same width, with some angle between
their main axes.

Define a 'non-cutting' line to be the line with the following properties:
- It runs along an inner segment main edge (the edges that are parallel to the segment axis)
- It starts at the end of an inner segment main edge closest to the shared start of the two segments
- It ends at the 'cutting point'/point of intersection of the two inner edges

Given the width of the two segments, the angle between their main axes, and the
ratio of the length of a 'non-cutting' line to the length of a segment's main edge,
find the length of a segment's main axis

This is a case where a picture would be worth a lot :/

Angle should be in radians

It would be nice to put this in a geometry object, or perhaps an object that
solved algebra problems in scissor situations */
function solveForScissorAxisLength(width,angle,ratio) {
  /*WLOG we can assume the start point is at the origin and one of the segments is parallel to the x-axis
    Express the inner segment edge that is NOT parallel to the x-axis as a line of the form ax+b*/
    var a = Math.abs(Math.tan(angle)); var b = -Math.abs(1/Math.cos(angle))*(width/2);
    var intersectionX = (width/2 - b) / a; //Solve ax+b for x when y = width/2
    var nonCuttingLineLength = intersectionX+width/2;

    //We want ratio = nonCuttingLineLength / (axisLength + width)
    return nonCuttingLineLength/ratio- width;

}

function Stars(center_pos) {

  var Star = function(pos,grid_x,grid_y) {
    this.x = pos.x;
    this.y = pos.y;
    this.r = 1+Math.floor(Math.random()*3),
    this.gx = grid_x;
    this.gy = grid_y;

    Star.prototype.draw = function(canvas) {
      canvas.fillStyle = '#EEEEEE';
      canvas.beginPath();
      canvas.arc(this.x, this.y, this.r, 0, 2*Math.PI, false);
      canvas.fill();
      canvas.fillStyle = '#000000';
    }

    Star.prototype.inside = function(xmin,xmax,ymin,ymax) {
      return (xmin <= (this.x-this.r)) & ((this.x+this.r) <= xmax) & (ymin <= (this.y-this.r)) & ((this.y+this.r) <= ymax);
    }

    Star.prototype.insideGrid = function (xmin,xmax,ymin,ymax) {
      return (xmin <= this.gx) & (this.gx <= xmax) & (ymin <= this.gy) & (this.gy <= ymax);
    }

    Star.prototype.update = function(motion) {
      this.x -= motion.x;
      this.y += motion.y;
    }

    Star.prototype.shift_grid_cell = function(dh,dv) {
      this.gx += dh;
      this.gy += dv;
    }

    Star.prototype.toString = function() {
      return 'star @' + this.gx + ',' + this.gy;
    }
  }

  var StarSet = new Set();
  //one star per starbox_size (px) x starbox_size (px) grid cell
  const starbox_size = 100;
  const grid_size = 15;
  const cx = center_pos.x;
  const cy = center_pos.y;

  //screen center starts in the middle of a grid cell
  var screen_center_x = 15;
  var screen_center_y = 15;

  var addStar = function(i,j,set) {
    var basex = cx-screen_center_x + starbox_size*(i-Math.floor(grid_size/2)),
        basey = cy-screen_center_y + starbox_size*(j-Math.floor(grid_size/2)),
        star_pos = V(basex + starbox_size*Math.random(),basey+starbox_size*Math.random());
    set.add(new Star(star_pos,i,j));
  }

  for (let i = 0; i < grid_size; i++) {
    for (let j = 0; j < grid_size; j++) {
      addStar(i,j,StarSet);
    }
  }

  var addBorderStars = function(vertical_sweep_x,horizontal_sweep_y) {
    if (vertical_sweep_x !== undefined) {
      for (let i = 1; i < grid_size - 1; i++) {
        addStar(vertical_sweep_x,i,StarSet);
      }
    }

    if (horizontal_sweep_y !== undefined) {
      for (let i = 1; i < grid_size - 1; i++) {
        addStar(i,horizontal_sweep_y,StarSet);
      }
    }

    if (vertical_sweep_x === 0 || horizontal_sweep_y === 0) {
      addStar(0,0,StarSet);
    }
    if (vertical_sweep_x === 0 || horizontal_sweep_y === grid_size-1) {
      addStar(0,grid_size-1,StarSet);
    }
    if (vertical_sweep_x === grid_size-1 || horizontal_sweep_y === 0) {
      addStar(grid_size-1,0,StarSet);
    }
    if (vertical_sweep_x === grid_size-1 || horizontal_sweep_y === grid_size-1) {
      addStar(grid_size-1,grid_size-1,StarSet);
    }
  }

  Stars.prototype.update = function(motion) {

    var delta_vertical = 0,
        delta_horizontal = 0,
        horizontal_sweep_y,
        vertical_sweep_x,
        i,
        entry;

    screen_center_x -= motion.x;
    screen_center_y += motion.y;

    if (screen_center_x < 0) {
      delta_horizontal = -1;
      vertical_sweep_x = grid_size-1;
    } else if (screen_center_x > starbox_size) {
      delta_horizontal = 1;
      vertical_sweep_x = 0;
    }

    if (screen_center_y < 0) {
      delta_vertical = -1;
      horizontal_sweep_y = grid_size-1;
    } else if (screen_center_y > starbox_size) {
      delta_vertical = 1;
      horizontal_sweep_y = 0;
    }

    StarSet.forEach(function (val) {
      val.shift_grid_cell(delta_horizontal,delta_vertical);
      val.update(motion);
    });

    addBorderStars(vertical_sweep_x,horizontal_sweep_y);

    for (var entry of StarSet) {
      if (! entry.insideGrid(0,grid_size-1,0,grid_size-1)) {
        StarSet.delete(entry);
      }
    }

    console.log('Number of stars: ' + StarSet.size);
    screen_center_x = mod(screen_center_x, starbox_size);
    screen_center_y = mod(screen_center_y, starbox_size);

  }

  Stars.prototype.draw = function(canvas) {
    for (var entry of StarSet) {
      if (entry.inside(0,screen_width,0,screen_height)) {
        entry.draw(canvas);
      }
    }
  }
}

function Game(config, gnum) {
    Object.call(this);

    this.screen_id = 'game';
    this.config = config;
    this.game_number = gnum;

    this.ship = new Ship(config);
    this.collisions = [];
    this.stars = config.stars ? new Stars(V(350,350)) : undefined;

    this.score = {};
    this.score.pnts = 0;
    this.score.raw_pnts = 0;

    this.keyState = new KeyState();

    this.gameTimer = new Timer();
    this.currentTick = 0;

    this.currentFrameEvents = [];

    this.num_deaths = 0;

    return this;
}

Game.prototype = {};

Game.prototype.lengthFromWidth = function(width) {
  var min_angle = deg2rad(this.config.min_angle);
  var max_angle = deg2rad(this.config.max_angle);
  var maximizing_angle = Math.min(Math.abs(min_angle), Math.abs(Math.PI-max_angle));

  return solveForScissorAxisLength(width,maximizing_angle,0.55);
}

Game.prototype.genStartSegments = function() {

  this.min_angle = deg2rad(this.config.min_angle);
  this.max_angle = deg2rad(this.config.max_angle);

  this.segment = new Segment(V(350,350),V(350+this.rect_length,350),this.half_width,false);
  var angle_range = this.max_angle - this.min_angle;
  var parity = 1-2*Math.floor(2*Math.random());
  var phi = (this.min_angle + Math.random()*angle_range)*parity;

  var begin = this.segment.end.duplicate();
  var margin = this.half_width;
  var old_dir = this.segment.direction();
  var theta = Math.atan2(old_dir.y,old_dir.x);
  var diff_x = this.rect_length*Math.cos(phi+theta);
  var diff_y = this.rect_length*Math.sin(phi+theta);
  var end = begin.duplicate().add(V(diff_x,diff_y));
  this.next_segment = new Segment(begin,end,margin,true);
  this.saved_segment = this.segment.copy();
  this.saved_next_segment = this.next_segment.copy();
}

Game.prototype.init = function () {

    if (!this.config.staircase || !exp.rect_width || ! exp.rect_length) {
        exp.rect_width = this.config.rect_width;
        exp.rect_length = this.lengthFromWidth(exp.rect_width);
    }
    this.half_width = exp.rect_width/2;
    this.rect_length = exp.rect_length;
    this.genStartSegments();

    $("#experiment_area").html('<div class="canvasarea"><canvas id="screen-canvas" width="' + screen_width + '" height="' + screen_height + '"></canvas></div>');

    this.canvas = document.getElementById('screen-canvas').getContext('2d');
    var self = this;
    this.timer = window.setInterval($.proxy(this.tick, this), 33);
    this.addEventListeners();

    this.canvas.lineWidth = 1.4;
    this.last_tick_time = null;
    this.tinc = 0;

    exp.resetGameData();

    // Record game specific data
    exp.gameDataLog.push({'rect_width': 2*this.half_width, 'rect_length': this.rect_length});

    exp.lg('start', {'n': this.game_number, 'rect_width': 2*this.half_width, 'rect_length': this.rect_length});

};

Game.prototype.addEventListeners = function () {
    $(document).on('keydown', $.proxy(this.keydown_event, this));
    $(document).on('keyup', $.proxy(this.keyup_event, this));
};

Game.prototype.clearEvents = function () {
    $(document).off('keydown', $.proxy(this.keydown_event));
    $(document).off('keyup', $.proxy(this.keyup_event));
};

Game.prototype.play = function (x) {
    // x.prop('currentTime', 0);
    // x.trigger('play');
    x.play();
};

Game.prototype.keycode2name = function(ev) {
    if (ev.which == 65) {
        return 'left';
    } else if (ev.which == 68) { // 69) {
        return 'right';
    } else if (ev.which == 87) { // 188) {
        return 'thrust';
    // } else if (ev.which == 81) {
    //     return 'quit';
    } else if (ev.which == 27) {
        return 'quit';
    } else {
        return null;
    }
};

Game.prototype.keydown_event = function(ev) {
    var sym = this.keycode2name(ev);
    if (sym == 'quit' && isDebugMode()) {
        ev.preventDefault();
        window.clearInterval(this.timer);
        window.clearTimeout(this.restart_ticks_timer);
        this.clearEvents();
    } else if (sym !== null) {
        this.keyState.press(sym);
        ev.preventDefault();
    }
};

Game.prototype.keyup_event = function (ev) {
    var sym = this.keycode2name(ev);
    if (sym !== null) {
        this.keyState.release(sym);
        ev.preventDefault();
    }
};

Game.prototype.getWorldState = function (include_tick) {
    var line = [this.gameTimer.elapsed(),
                // ship
                this.ship.alive?1:0,
                //Math.round(this.ship.position.x*1000),
                //Math.round(this.ship.position.y*1000),
                // We want 2 decimals of precision
                Math.round(this.ship.velocity.x * 1000),
                Math.round(this.ship.velocity.y * 1000),
                Math.floor(this.ship.angle),
		            Math.round(this.segment.start.x * 1000),
                Math.round(this.segment.start.y * 1000),
                Math.round(this.segment.end.x * 1000),
                Math.round(this.segment.end.y * 1000),
		            Math.round(this.next_segment.start.x * 1000),
                Math.round(this.next_segment.start.y * 1000),
                Math.round(this.next_segment.end.x * 1000),
                Math.round(this.next_segment.end.y * 1000),
                this.score.pnts,
                // key state
                this.keyState.keys['thrust']?1:0,
                this.keyState.keys['left']?1:0,
                this.keyState.keys['right']?1:0,
                //this.keyState.keys['fire']?1:0
                ];

    if (include_tick) {
        line.push(this.currentTick);
    }

    return line;
};


Game.prototype.recordWorldState = function (include_tick) {
    exp.gameDataLog.push(this.getWorldState(include_tick));
};

Game.prototype.recordFrameEvents = function () {
    if (this.currentFrameEvents.length > 0) {
        this.currentFrameEvents.unshift(this.currentTick);
        exp.gameEventLog.push(this.currentFrameEvents);
    }
    this.currentFrameEvents = [];
};

Game.prototype.recordEverything = function () {
    this.recordFrameEvents();
    this.recordWorldState(false);
};

Game.prototype.recordMinimal = function () {
    this.recordFrameEvents();
    if (exp.gameKeyLog[exp.gameKeyLog.length-1][0] == this.currentTick) {
        this.recordWorldState(true);
    }
};

Game.prototype.addEvent = function (tag) {
    var idx = EVENT_CODES.indexOf(tag);
    var val;
    if (idx >= 0) val = idx; else val = tag;
    this.currentFrameEvents.push(val);
};

Game.prototype.penalize = function (amt) {
    this.score.raw_pnts -= amt;
    this.score.pnts -= amt;
    if (this.score.pnts < 0) this.score.pnts = 0;
};

Game.prototype.reward = function (amt) {
    this.score.raw_pnts += amt;
    this.score.pnts += amt;
};

Game.prototype.monitor_ship_respawn = function () {
    if (this.ship.alive === false && this.ship.deathTimer.elapsed() >= 1000) {
        this.ship.reset();
        this.next_segment = this.saved_next_segment.copy();
        this.segment = this.saved_segment.copy();
        this.addEvent('ship-respawn');
    }
};

Game.prototype.process_key_state = function () {
    var acc = [this.currentTick];
    var e;
    for (e=0; e<this.keyState.events.length; e++) {
        var evt = this.keyState.events[e];
        acc.push([evt['type'], KEY_CODES.indexOf(evt['key'])]);
        if (evt['type'] == 1) {
            if (evt['key'] == 'left' || evt['key'] == 'right') {
                this.ship.turn_flag = evt['key'];
            } else if (evt['key'] == 'thrust') {
                this.ship.thrust_flag = true;
            } else if (evt['key'] == 'fire') {
                //this.fire_missile();
            }
        } else {
            if (evt['key'] == 'left' || evt['key'] == 'right') {
                this.ship.turn_flag = null;
            } else if (evt['key'] == 'thrust') {
                this.ship.thrust_flag = false;
            }
        }
    }

    if (acc.length > 1) {
        exp.gameKeyLog.push(acc);
    }
    this.keyState.clear();
};

Game.prototype.kill_ship = function () {
    if (this.ship.alive) {
        this.penalize(this.config.ship_death_penalty);
        this.ship.alive = false;
        this.ship.deathTimer.reset();
        window.clearInterval(this.timer);
        this.restart_ticks_timer = window.setTimeout($.proxy(this.restart_ticks, this), this.config.ship_explode_duration);
        this.num_deaths++;
    }
};

Game.prototype.restart_ticks = function () {
    this.timer = window.setInterval($.proxy(this.tick, this), 33);
    // kludge to get the timers and fortress to behave
    this.ship.deathTimer.tick(1000);
    // console.log('restart');
    // this.tick();
};

Game.prototype.update_ship = function () {
    if (this.ship.alive) {

        if (!this.segment.contains(this.ship.position) && !this.next_segment.contains(this.ship.position)) {
            this.kill_ship();
        }
        if (this.config.auto_turn) {
            this.ship.angle = Math.floor(angle_to(this.ship.position, this.fortress.position));
            //console.log(this.ship.position.x, this.ship.position.y, this.fortress.position.x, this.fortress.position.y, angle_to(this.ship.position, this.fortress.position));
        } else {
            if (this.ship.turn_flag == 'right') {
                this.ship.angle = mod(this.ship.angle - this.ship.turn_speed, 360);
            } else if (this.ship.turn_flag == 'left') {
                this.ship.angle = mod(this.ship.angle + this.ship.turn_speed, 360);
            }
        }
        if (this.ship.thrust_flag) {
            this.ship.velocity.x += this.ship.acceleration * Math.cos(deg2rad(this.ship.angle));
            this.ship.velocity.y += this.ship.acceleration * Math.sin(deg2rad(this.ship.angle));
        }
        // Max Speed
        // if (this.ship.velocity.x > this.config.ship_max_vel) {
        //     this.ship.velocity.x = this.config.ship_max_vel;
        //     console.log('max x');
        // } else if (this.ship.velocity.x < -this.config.ship_max_vel) {
        //     this.ship.velocity.x = -this.config.ship_max_vel;
        //     console.log('max -x');
        // }
        // if (this.ship.velocity.y > this.config.ship_max_vel) {
        //     this.ship.velocity.y = this.config.ship_max_vel;
        //     console.log('max y');
        // } else if (this.ship.velocity.y < -this.config.ship_max_vel) {
        //     this.ship.velocity.y = -this.config.ship_max_vel;
        //     console.log('max -y');
        // }

        //this.ship.position.x += this.ship.velocity.x;
        //this.ship.position.y -= this.ship.velocity.y;

    }
};

Game.prototype.update_rectangles = function() {
    if (this.ship.alive) {
        //should probably switch the order of the update and the if statement
        //currently doesn't preserve the invariant that the ship is either in the green rectangle or not alive
        if (this.next_segment.contains(this.ship.position) && !this.segment.contains(this.ship.position)) {
 	    console.log("I'm in a new rectangle.");
            this.segment = this.next_segment;
            this.segment.ghost = false;

            var parity = 1-2*Math.floor(2*Math.random());
            var range = this.max_angle-this.min_angle;
            var phi = (Math.random()*range+this.min_angle)*parity;
            var l = this.rect_length;
            var w = this.half_width;
            var begin = this.segment.end.duplicate();
            var old_dir = this.segment.direction();
            var theta = Math.atan2(old_dir.y,old_dir.x);
            var next_end_diff
              = V(l*Math.cos(phi+theta),l*Math.sin(phi+theta));
            this.next_segment = new Segment(begin,next_end_diff.add(begin),w,true);
            this.reward(this.config.enter_rectangle);
            this.saved_segment = this.segment.copy();

            this.ship.startVelocity = this.segment.direction();
            this.ship.startVelocity.y = -this.ship.startVelocity.y;
            this.ship.startVelocity.normalize();
            this.ship.startOrientation = rad2deg(Math.atan2(-this.segment.direction().y,this.segment.direction().x));
            this.saved_next_segment = this.next_segment.copy()

            var delta = this.ship.position.duplicate().sub(this.saved_segment.start);
            this.saved_segment.start.add(delta);
            this.saved_segment.end.add(delta);
            this.saved_next_segment.start.add(delta);
            this.saved_next_segment.end.add(delta);
        }
        this.segment.update(this.ship.velocity);
        this.next_segment.update(this.ship.velocity);
    }
}

Game.prototype.draw = function () {
    var i;

    this.canvas.clearRect(0, 0, 710, 626);

    this.canvas.save();
    this.canvas.translate(0,-50);

    this.stars ? this.stars.draw(this.canvas) : undefined;
    this.segment.draw(this.canvas);
    this.next_segment.draw(this.canvas);
    this.ship.draw(this.canvas);


    this.canvas.restore();

    var label_width = 89;
    var pad = 16;
    var score_y = 520;
    var start = (710-89*2)/2;

    this.canvas.clearRect(start, score_y, label_width*2, 64);

    this.canvas.beginPath();
    this.canvas.strokeStyle = "#00FF00";
    this.canvas.rect(start + 0.5, score_y + 0.5, label_width*2, 64);
    this.canvas.moveTo(start+89.5, score_y);
    this.canvas.lineTo(start+89.5, score_y+64);
    this.canvas.moveTo(start+0.5, score_y+32);
    this.canvas.lineTo(start+0.5+label_width*2, score_y+32);
    this.canvas.stroke();

    this.canvas.textAlign = 'center';
    this.canvas.textBaseline = 'middle';

    // this.canvas.fillText("PNTS", start + 89/2, score_y+17);
    // this.canvas.fillText("VLNR", start + 89 + 89/2, score_y+17);

    // this.canvas.fillText(this.score.pnts.toString(), start + 89/2, score_y+32+17);
    // this.canvas.fillText(this.score.vulnerability.toString(), start + 89 + 89/2, score_y+32+17);

    this.canvas.fillStyle = "#00FF00";
    this.canvas.font = "14px sans-serif";

    this.canvas.fillText("PNTS", start + 89/2, score_y+18);

    this.canvas.font = "16px sans-serif";
    this.canvas.fillStyle = "#FFFF00";

    this.canvas.fillText(this.score.pnts.toString(), start + 89/2, score_y+32+18);

};

Game.prototype.step_timers = function () {
    this.currentTick += 1;
    this.ship.deathTimer.tick(this.tinc);
};

Game.prototype.update_time = function () {
    var now = getCurrentTime();
    if (this.last_tick_time === null) { this.last_tick_time = now; }
    this.tinc = now - this.last_tick_time;
    this.last_tick_time = now;
    // Advance the game timer but not the other timers because that's
    // how original autoturn works.
    this.gameTimer.tick(this.tinc);
};

Game.prototype.step_one_tick = function () {
    this.update_time();
    this.process_key_state();
    this.monitor_ship_respawn();
    
    this.update_ship();
    this.update_rectangles();
    this.stars ? this.stars.update(this.ship.velocity) : undefined;
    // console.log('alive', this.gameTimer.elapsed(), this.tinc, this.ship.deathTimer.elapsed(), this.ship.alive);
    
    this.recordEverything();
    this.step_timers();
};

Game.prototype.tick = function () {
    this.step_one_tick();
    this.draw();
    if (this.gameTimer.elapsed() >= this.config.game_time) {
        exp.nextScreen();
    }
};

Game.prototype.calculateBonus = function () {
    this.bonus = Math.min(this.config.max_bonus, Math.ceil((this.score.pnts / this.config.max_points) * this.config.max_bonus));
};

Game.prototype.cleanup = function () {

    if (this.config.staircase) {
      if (this.num_deaths > this.config.staircase_increase_threshold) {
         var next = exp.rect_width+this.config.staircase_delta;
         exp.rect_width = Math.min(next,this.config.rect_width);
         exp.rect_length = this.lengthFromWidth(exp.rect_width);

      } else if (this.num_deaths < this.config.staircase_decrease_threshold) {
        var next = exp.rect_width-this.config.staircase_delta;
        exp.rect_width = Math.max(next,this.config.min_rect_width);
        exp.rect_length = this.lengthFromWidth(exp.rect_width);

      }
    }

    window.clearInterval(this.timer);
    window.clearTimeout(this.restart_ticks_timer);
    this.clearEvents();
    this.calculateBonus();
    exp.gameReward = this.bonus;
    exp.gamePoints = this.score.pnts;
    exp.addReward(this.bonus);
    // Send it all to the server
    exp.com.sendGameData(this.game_number, exp.gameDataLog, exp.gameEventLog, exp.gameKeyLog);
    exp.lg('end', {'bonus': this.bonus, 'points': this.score.pnts, 'rawpnts': this.score.raw_pnts});
};
