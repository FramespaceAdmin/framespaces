var _ = require('lodash'),
    EventEmitter = require('events'),
    History = require('../client/history'),
    Action = require('../client/action'),
    assert = require('chai').assert;

describe('History', function () {
  var subject = new EventEmitter(), ok = _.constant(true);

  it('should perform an action', function () {
    var history = new History(subject);
    var acted = false, done = false;
    var action = new Action({ do : function () { return acted = true; } })
    action.isUser = true;
    history.on('done', function (a) {
      assert.equal(action, a);
      done = true;
    });
    history.step(action);
    assert.isTrue(acted);
    assert.isTrue(done);
  });

  it('should perform two actions', function () {
    var history = new History(subject);
    var acted1 = false, acted2 = false;
    var action1 = new Action({ do : function () { return acted1 = true; } })
    action1.isUser = true;
    history.step(action1);
    var action2 = new Action({ do : function () { return acted2 = true; } })
    action2.isUser = true;
    history.step(action2);
    assert.isTrue(acted1);
  });

  it('should undo an action', function () {
    var history = new History(subject);
    var unacted = false, undone = false;
    var action = new Action({ do : function () {} })
    action.isUser = true;
    action.un = function () { return new Action({ do : function () { return unacted = true; } }) };
    history.on('undone', function (a) {
      assert.equal(action, a);
      undone = true;
    });
    history.step(action);
    history.prev();
    assert.isTrue(unacted);
    assert.isTrue(undone);
  });

  it('should redo an action', function () {
    var history = new History(subject);
    var acted = false, reacted = false, redone = false;
    var action = new Action({ do : function () { return !acted ? (acted = true) : (reacted = true); } })
    action.isUser = true;
    action.un = function () { return new Action({ do : function () {} }) };
    history.on('redone', function (a) {
      assert.equal(action, a);
      redone = true;
    });
    history.step(action);
    history.prev();
    history.next();
    assert.isTrue(reacted);
    assert.isTrue(redone);
  });

  it('should add future suggestions by confidence', function () {
    var history = new History(subject);
    var acted1 = false, acted2 = false, unacted1 = false;
    var action1 = new Action({ do : function () { return acted1 = true; } })
    action1.un = function () { return new Action({ do : function () { return unacted1 = true; } }) }
    action1.confidence = 0.9;
    var action2 = new Action({ do : function () { return acted2 = true; } })
    action2.confidence = 0.8;
    history.add([action1, action2]);
    history.next();
    assert.isTrue(acted1);
    history.next();
    assert.isTrue(unacted1); // action2 was dependent on an earlier state
    assert.isTrue(acted2);
  });

  it('should inject future suggestions by confidence', function () {
    var history = new History(subject);
    var acted1 = false, acted2 = false, unacted1 = false;
    var action1 = new Action({ do : function () { return acted1 = true; } })
    action1.un = function () { return new Action({ do : function () { return unacted1 = true; } }) }
    action1.confidence = 0.9;
    var action2 = new Action({ do : function () { return acted2 = true; } })
    action2.confidence = 0.8;
    history.add([action2]);
    history.add([action1]);
    history.next();
    assert.isTrue(acted1);
    history.next();
    assert.isTrue(unacted1);
    assert.isTrue(acted2);
  });

  it('should linearise the past when an action is taken', function () {
    var history = new History(subject);
    var acted1 = false, acted2 = false, unacted2 = false, unacted0 = false;
    var action0 = new Action({ do : function () {} })
    action0.un = function () { return new Action({ do : function () { unacted0 = true; } }) }
    action0.isUser = true;
    history.step(action0);
    var action1 = new Action({ do : function () { return acted1 = true; } })
    action1.un = function () { return new Action({ do : function () {} }) }
    action1.confidence = 0.9;
    var action2 = new Action({ do : function () { return acted2 = true; } })
    action2.un = function () { return new Action({ do : function () { return unacted2 = true; } }) }
    action2.confidence = 0.8;
    history.add([action1, action2]);
    history.next(); // Do action1
    history.next(); // Do action2
    var acted3 = false;
    var action3 = new Action({ do : function () {} })
    action3.isUser = true;
    action3.un = function () { return new Action({ do : function () {} }) };
    history.step(action3);
    history.prev(); // Undo action3
    history.prev(); // Undo action2
    assert.isTrue(unacted2);
    history.prev(); // Undo action0 (as if action1 never happened)
    assert.isTrue(unacted0);
  });
});
