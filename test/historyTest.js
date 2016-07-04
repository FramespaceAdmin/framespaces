var _ = require('lodash'),
    EventEmitter = require('events'),
    History = require('../client/history'),
    assert = require('chai').assert;

describe('History', function () {
  var subject = new EventEmitter();

  it('should perform an action', function () {
    var history = new History(subject);
    var acted = false, done = false;
    function action() {
      return acted = true;
    }
    history.on('done', function (a) {
      assert.equal(action, a);
      done = true;
    });
    history.step(action, true);
    assert.isTrue(acted);
    assert.isTrue(done);
  });

  it('should undo an action', function () {
    var history = new History(subject);
    var unacted = false, undone = false;
    function action() {}
    action.undo = function () { return unacted = true; };
    history.on('undone', function (a) {
      assert.equal(action, a);
      undone = true;
    });
    history.step(action, true);
    history.undo();
    assert.isTrue(unacted);
    assert.isTrue(undone);
  });

  it('should redo an action', function () {
    var history = new History(subject);
    var acted = false, reacted = false, redone = false;
    function action() { return !acted ? (acted = true) : (reacted = true); }
    action.undo = function () {};
    history.on('redone', function (a) {
      assert.equal(action, a);
      redone = true;
    });
    history.step(action, true);
    history.undo();
    history.next();
    assert.isTrue(reacted);
    assert.isTrue(redone);
  });

  it('should add future suggestions by confidence', function () {
    var history = new History(subject);
    var acted1 = false, acted2 = false, unacted1 = false;
    function action1() { return acted1 = true; }
    action1.undo = function () { return unacted1 = true; }
    action1.confidence = 0.9;
    function action2() { return acted2 = true; }
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
    function action1() { return acted1 = true; }
    action1.undo = function () { return unacted1 = true; }
    action1.confidence = 0.9;
    function action2() { return acted2 = true; }
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
    function action0() {}
    action0.undo = function () { unacted0 = true; }
    history.step(action0, true);
    function action1() { return acted1 = true; }
    action1.undo = function () {}
    action1.confidence = 0.9;
    function action2() { return acted2 = true; }
    action2.undo = function () { return unacted2 = true; }
    action2.confidence = 0.8;
    history.add([action1, action2]);
    history.next(); // Do action1
    history.next(); // Do action2
    var acted3 = false;
    function action3() {}
    action3.undo = function () {};
    history.step(action3, true);
    history.undo(); // Undo action3
    history.undo(); // Undo action2
    assert.isTrue(unacted2);
    history.undo(); // Undo action0 (as if action1 never happened)
    assert.isTrue(unacted0);
  });
});
