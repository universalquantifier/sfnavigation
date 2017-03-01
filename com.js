// Communication with server

var RESUME_SERVER_URL = '/perl/sf/resume.pl';
var STOREPROGRESS_SERVER_URL = '/perl/sf/store-progress.pl';
var LOGBLOCK_SERVER_URL = '/perl/sf/store-log-block.pl';
var GAMEDATA_SERVER_URL = '/perl/sf/store-game-data.pl';
var LOG_SERVER_URL = '/perl/sf/store-log.pl';

function Payload (url, timeout, data) {
    this.url = url;
    this.data = data;
    this.timeout = timeout;
    this.completed = false;
    this.timestamp = 0;
    this.request = null;
    this.callback = null;
}

Payload.prototype = {
    send: function () {
        this.timestamp = getCurrentTime();
        this.request = $.ajax(this.url,
                              { 'type' : 'POST',
                                'data' : this.data,
                                'dataType' : 'json',
                                'timeout' : this.timeout
                              });
        this.request.success($.proxy(this.success, this));
        this.request.error($.proxy(this.fail, this));
    },

    notifyCallback: function (result) {
        if (this.callback) this.callback(result);
    },

    success: function (ret) {
        this.completed = ret.success;
        this.request = null;
        if (this.completed) {
            this.data = null;
        }
        this.notifyCallback(this.completed);
    },

    fail: function (xhr, status, thrownerror) {
        this.request = null;
        this.notifyCallback(false);
    },

    revisit: function () {
        if (this.completed) return;
        if (this.request && this.request.readyState !== 4) {
            if (getCurrentTime() - this.timestamp > this.timeout) {
                this.request.abort();
            } else {
                return;
            }
        }
        this.send();
    },

    abortOverride: function () {
        if (this.completed) return;
        if (this.request) this.request.abort();
        this.request = null;
    }
};

function Com(worker_id, assignment_id, hit_id) {
    this.worker_id = worker_id;
    this.assignment_id = assignment_id;
    this.hit_id = hit_id;
    this.session_id = getCurrentTime();
    this.log_offset = 0;
    this.log_blocks = [];

    this.game_data_requests = [];

    return this;
}

Com.prototype = {};

Com.prototype.isGameLogsComplete = function () {
    var ret = true;
    $.each(this.game_data_requests, function (i, p) { ret = ret && p.completed; });
    return ret;
}

Com.prototype.setGameLogCallback = function (callback) {
    $.each(this.game_data_requests, function (i, p) { p.callback = callback; });
};

Com.prototype.revisitThing = function (thing, override) {
    if (override) {
        $.each(thing, function (i, p) { p.abortOverride(); });
    }
    $.each(thing, function (i, p) { p.revisit(); });
};

Com.prototype.revisitLogBlocks = function (override) {
    this.revisitThing(this.log_blocks, override);
};

Com.prototype.revisitGameData = function (override) {
    this.revisitThing(this.game_data_requests, override);
};

Com.prototype.synchronizeLog = function (log) {
    if (log.length > this.log_offset) {
        var logPortion = log.slice(this.log_offset, log.length);
        this.log_offset = log.length;
        var p = new Payload(LOGBLOCK_SERVER_URL, 10000,
                            { 'assignment_id' : this.assignment_id,
                              'worker_id' : this.worker_id,
                              'hit_id' : this.hit_id,
                              'session_id': this.session_id,
                              'sync_id': this.log_blocks.length,
                              'log': JSON.stringify(logPortion) });
        this.log_blocks.unshift(p);
    }
    this.revisitLogBlocks(false);
};

Com.prototype.sendLog = function (log, extra, successCallback, failCallback) {
    var r;
    r = $.ajax(LOG_SERVER_URL,
               { 'type' : 'POST',
                 'data' : { 'assignment_id' : this.assignment_id,
                            'worker_id' : this.worker_id,
                            'hit_id' : this.hit_id,
                            'extra': JSON.stringify(extra),
                            'log' : JSON.stringify(log) },
                 'dataType' : 'json',
                 'timeout': 60000
               });
    r.success(successCallback);
    r.error(function (xhr, status, thrownerror) {
        failCallback(status);
    });
};

Com.prototype.storeProgress = function (idx, reward, game_reward, game_points, condition, rect_width, rect_length) {
    var r = $.ajax(STOREPROGRESS_SERVER_URL,
           { 'type' : 'POST',
             'data' : { 'worker_id' : getWorkerId(),
                        'assignment_id' : getAssignmentId(),
                        'idx' : idx,
                        'reward' : reward,
                        'game_reward' : game_reward,
                        'game_points' : game_points,
                        'rect_width' : rect_width,
                        'rect_length' : rect_length,
                        'condition' : condition},
             'dataType' : 'json' });
    r.success(function (data) {
       if (data.success !== true) {
           console.log('storeProgress failed: ' + data);
       }
    });
    r.error(function (event, xhr, settings, thrownerror) {
       console.log('storeProgress totally failed');
    });
};

Com.prototype.sendGameData = function (game_number, logData, eventData, keyData) {
    var p = new Payload(GAMEDATA_SERVER_URL, 120000,
                        { 'assignment_id' : this.assignment_id,
                          'worker_id' : this.worker_id,
                          'hit_id' : this.hit_id,
                          'session_id': this.session_id,
                          'game' : game_number,
                          'keys' : JSON.stringify(keyData),
                          'log' : JSON.stringify(logData),
                          'events' : JSON.stringify(eventData) });
    this.game_data_requests.unshift(p);
    this.revisitGameData(false);
};

function getResume (resumeCallback, startCallback, rejectCallback, errorCallback) {
    var r = $.ajax(RESUME_SERVER_URL,
                   { 'type' : 'POST',
                     'data' : { 'worker_id' : getWorkerId(),
                                'assignment_id' : getAssignmentId() },
                     'dataType' : 'json' });
    r.success(function (data) {
        if (data.success === true) {
            if (data.reject === true) {
                rejectCallback(data.reason);
            } else if (data.resumable === true) {
                resumeCallback(data.idx, data.condition, data.reward, data.game_reward, data.game_points, data.rect_width, data.rect_length);
            } else {
                startCallback();
            }
        } else {
            errorCallback('resume failed: ' + data);
        }
    });
    r.error(function (event, xhr, settings, thrownerror) {
        errorCallback('resume totally failed');
    });
}
