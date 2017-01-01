var _ = require('lodash'),
    EventEmitter = require('events'),
    History = require('../client/history'),
    SetAction = require('./setAction'),
    assert = require('chai').assert;

describe('History', function () {
  var ok = _.constant(true);

  it('should perform an action', function () {
    var subject = new EventEmitter();
    var history = new History(subject);
    var done = false;
    var action = new SetAction({ id : 'a', isUser : true });
    history.on('done', function (a) {
      assert.equal(action, a);
      done = true;
    });
    history.step(action);
    assert.isTrue(subject.a);
    assert.isTrue(done);
  });

  it('should perform two actions', function () {
    var subject = new EventEmitter();
    var history = new History(subject);
    var acted1 = false, acted2 = false;
    var action1 = new SetAction({ id : 'a', isUser : true });
    history.step(action1);
    var action2 = new SetAction({ id : 'b', isUser : true });
    history.step(action2);
    assert.isTrue(subject.a);
    assert.isTrue(subject.b);
  });

  it('should undo an action', function () {
    var subject = new EventEmitter();
    var history = new History(subject);
    var undone = false;
    var action = new SetAction({ id : 'a', isUser : true });
    history.on('undone', function (a) {
      assert.equal(action, a);
      undone = true;
    });
    history.step(action);
    history.prev();
    assert.isUndefined(subject.a);
    assert.isTrue(undone);
  });

  it('should redo an action', function () {
    var subject = new EventEmitter();
    var history = new History(subject);
    var redone = false;
    var action = new SetAction({ id : 'a', isUser : true });
    history.on('redone', function (a) {
      assert.equal(action, a);
      redone = true;
    });
    history.step(action);
    history.prev();
    history.next();
    assert.isTrue(subject.a);
    assert.isTrue(redone);
  });

  it('should add future suggestions', function () {
    var subject = new EventEmitter();
    var history = new History(subject);
    var action1 = new SetAction({ id : 'a', isUser : true, confidence : 0.9 });
    var action2 = new SetAction({ id : 'b', isUser : true, confidence : 0.8 });
    history.add([action1, action2]);
    history.next();
    assert.isTrue(subject.a);
    history.next();
    assert.isUndefined(subject.a); // action2 was dependent on an earlier state
    assert.isTrue(subject.b);
  });

  it('should inject future suggestions by confidence', function () {
    var subject = new EventEmitter();
    var history = new History(subject);
    var action1 = new SetAction({ id : 'a', confidence : 0.9 });
    var action2 = new SetAction({ id : 'b', confidence : 0.8 });
    history.add([action2]);
    history.add([action1]);
    history.next();
    assert.isTrue(subject.a);
    history.next();
    assert.isUndefined(subject.a);
    assert.isTrue(subject.b);
  });

  it('should linearise the past when an action is taken', function () {
    var subject = new EventEmitter();
    var history = new History(subject);
    var action0 = new SetAction({ id : 'a', isUser : true });
    history.step(action0);
    var action1 = new SetAction({ id : 'b', confidence : 0.9 });
    var action2 = new SetAction({ id : 'c', confidence : 0.8 });
    history.add([action1, action2]);
    history.next(); // Do action1
    history.next(); // Do action2
    var action3 = new SetAction({ id : 'd', isUser : true });
    history.step(action3);
    history.prev(); // Undo action3
    history.prev(); // Undo action2
    assert.isUndefined(subject.c);
    history.prev(); // Undo action0 (as if action1 never happened)
    assert.isUndefined(subject.a);
  });
});
