var _ = require('lodash'),
    Batch = require('./action/batch'),
    log = require('../lib/log'),
    EventEmitter = require('events');

function History(subject) {
  this.present = {};
  this.revising = false;
  this.subject = subject;

  subject.on('changed', _.bind(function () {
    if (!this.revising) {
      var p = this.present, n = p.next;
      // Rewind to an undoable state
      while (this.present.prev && !this.present.un().isOK(subject)) {
        this.present = this.present.prev;
      }
      // Set the next to a doable state
      while (this.present.next && !this.present.next.isOK(subject)) {
        this.present.next = this.present.next.next;
      }
      if (p !== this.present || n !== this.present.next) {
        this.emit('revised', this.present);
      }
    }
  }, this));

  _.each(['done', 'undone', 'redone'], _.bind(function (event) {
    this.on(event, function (action) {
      log.debug(event, ':', action.description);
    });
  }, this));
}

History.prototype = Object.create(EventEmitter.prototype);
History.prototype.constructor = History;

function revising(f) {
  return function () {
    if (!this.revising) {
      this.revising = true;
      try {
        return f.apply(this, arguments);
      } finally {
        this.revising = false;
        this.emit('revised', this.present);
      }
    } else {
      return f.apply(this, arguments);
    }
  }
}

function init(action, prev, next) {
  action.prev = prev;
  action.next = next;
}

function antecedents(action) {
  var ante = [action];
  while (action = action.prev) {
    ante.unshift(action);
    if (action.isUser) break; // optimisation
  }
  return ante;
}

/**
 * Takes the given action immediately. If the isUser flag is set, then
 * all suggested future states are disregarded and the past is linearised.
 */
History.prototype.step = revising(function (action) {
  if (action) {
    // User taking an explicit action collapses the wave-form and discards quantum states
    var nextAction = this.present.next;
    if (action.isUser && this.present.prev) {
      // Linearise the recent history so undo+redo behaves as expected
      this.present.prev.next = this.present;
    }
    this.present.next = action;
    init(action, this.present, action.isUser ? null : nextAction);
    this.next(action.results);
  }
});

/**
 * Adds the given actions as suggested future actions. Interleaves the actions
 * with any existing future actions based on action.confidence.
 */
History.prototype.add = revising(function (actions) {
  if (actions && actions.length) {
    _.each(actions, _.bind(function (action, i) {
      // Assign a place in the chain by confidence
      var insertAfter = this.present;
      while (insertAfter.next && insertAfter.next.confidence > action.confidence) {
        insertAfter = insertAfter.next;
      }
      // Future actions always undo back to the present
      init(action, this.present, insertAfter.next);
      insertAfter.next = action;
    }, this));
  }
});

/**
 * Enacts the next registered action, and shuffles the present forward.
 * If the action has already been done, a 'redone' event is fired, otherwise 'done',
 * in both cases with the action that was done.
 */
History.prototype.next = revising(function (done) {
  if (this.present.next) {
    // Rewind to a state required for the next action
    var action = this.present.next, branch = antecedents(action), posPresent;
    while ((posPresent = _.indexOf(branch, this.present)) === -1 && this.present.prev) {
      this.prev();
    }
    // If we don't have a result for the action, this is the first time
    var event = done || !action.results ? 'done' : 'redone';
    if (!done) {
      action.results = this.subject.changed(new Batch(branch.slice(posPresent + 1)).do(this.subject));
    }
    this.present = action;
    this.emit(event, action);
    return action;
  }
});

/**
 * Undoes the last action taken and shuffles the present backwards.
 * An 'undone' event is fired with the action that was undone.
 */
History.prototype.prev = revising(function () {
  if (this.present.prev) {
    var action = this.present;
    this.subject.changed(action.un().do(this.subject));
    this.present = this.present.prev;
    this.emit('undone', action);
  }
});

module.exports = History;
