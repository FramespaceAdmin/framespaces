var _ = require('lodash'),
    EventEmitter = require('events');

module.exports = function History(subject) {
  var events = new EventEmitter();
  var present = /* class Action extends function() */ { /*
    id : String,
    isOK : function() : boolean // Can this action be applied
    undo : Action,
    prev : undefined Action, // Set by history
    next : undefined Action, // Set by history
    preview : optional function(paper), // Paper is a temporary svg
    toJSON : function() // returns JSONable data,
    result : undefined value // the returned value, set by history,
    confidence : Number < 1 // for futures
*/};

  function revised(result) {
    delete revising.action;
    events.emit('revised', present);
    return result;
  }

  function revising(f) {
    return function () {
      revising.action = f;
      return revised(f.apply(this, arguments));
    }
  }

  function init(action, prev, next) {
    action.prev = prev;
    action.next = next;
  }

  /**
   * Takes the given action immediately. If the isUser flag is set, then
   * all suggested future states are disregarded and the past is linearised.
   */
  function step(action, isUser) {
    if (action) {
      // User taking an explicit action collapses the wave-form and discards quantum states
      var nextAction = present.next;
      if (isUser && present.prev) {
        // Linearise the recent history so undo+redo behaves as expected
        present.prev.next = present;
      }
      present.next = action;
      init(action, present, isUser ? null : nextAction);
      next();
    }
  }

  /**
   * Adds the given actions as suggested future actions. Interleaves the actions
   * with any existing future actions based on action.confidence.
   */
  function add(actions) {
    if (actions && actions.length) {
      _.each(actions, function (action, i) {
        // Assign a place in the chain by confidence
        var insertAfter = present;
        while (insertAfter.next && insertAfter.next.confidence > action.confidence) {
          insertAfter = insertAfter.next;
        }
        // Future actions always undo back to the present
        init(action, present, insertAfter.next);
        insertAfter.next = action;
      });
    }
  }

  /**
   * Enacts the net registered action, and shuffles the present forward.
   * If the action has already been done, a 'redone' event is fired, otherwise 'done',
   * in both cases with the action that was done.
   */
  function next() {
    if (present.next) {
      // Restore the state required for the next action
      var action = present.next, requiredPrev = present.next.prev;
      while (present.prev && present !== requiredPrev) {
        undo();
      }
      // If we already have a result for the action, this is a redo
      var event = action.result ? 'redone' : 'done';
      action.result = action();
      present = action;
      events.emit(event, action);
      return action;
    }
  }

  /**
   * Undoes the last action taken and shuffles the present backwards.
   * An 'undo' event is fired with the action that was undone.
   */
  function undo() {
    if (present.prev) {
      var action = present;
      action.undo();
      present = present.prev;
      events.emit('undone', action);
    }
  }

  subject.on('changed', function () {
    if (!revising.action) {
      var p = present, n = present.next;
      // Rewind to an undoable state
      while (present.prev && !present.undo.isOK()) {
        present = present.prev;
      }
      // Set the next to a doable state
      while (present.next && !present.next.isOK()) {
        present.next = present.next.next;
      }
      if (p !== present || n !== present.next) {
        revised();
      }
    }
  });

  this.step = revising(step);
  this.add = revising(add);
  this.next = revising(next);
  this.undo = revising(undo);
  this.on = _.bind(events.on, events);
};
