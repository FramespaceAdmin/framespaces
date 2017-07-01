var _ = require('lodash'),
    User = require('../client/user'),
    MockPaper = require('./mockPaper'),
    MockTool = require('./mockTool'),
    Picture = require('../client/picture'),
    assert = require('chai').assert;

describe('User', function () {
  it('should initialise inactive, with given user id', function () {
    var user = new User({ id : 'uid' });
    assert.equal(user.id, 'uid');
    assert.isFalse(user.state.active);
    assert.isFalse(user.isUsing('Bazooka'));
  });

  it('should report the name of the tool in use', function () {
    var picture = new Picture(MockPaper(10, 10));
    var user = new User({ id : 'uid' });
    user.use(new MockTool(picture));
    assert.isTrue(user.isUsing('MockTool'));
  });

  it('should not emit an interaction if no tool', function () {
    var user = new User({ id : 'uid' });
    user.on('interacting', function (delta, state) { assert.fail(); });
    user.interacting({ x : 1, y : 1 });
  });

  it('should not emit an interaction if updating', function () {
    var user = new User({ id : 'uid' });
    user.on('interacting', function (delta, state) { assert.fail(); });
    user.update({ x : 1, y : 1 });
  });

  it('should not emit an interaction if no change of activity', function () {
    var picture = new Picture(MockPaper(10, 10));
    var user = new User({ id : 'uid' });
    user.use(new MockTool(picture));
    user.on('interacting', function (delta, state) { assert.fail(); });
    user.interacting({ x : 1, y : 1 });
    assert.equal(user.state.x, 1);
    assert.equal(user.state.y, 1);
  });

  it('should emit an interaction if becoming active', function () {
    var picture = new Picture(MockPaper(10, 10));
    var user = new User({ id : 'uid' }), interacted = false;
    user.use(new MockTool(picture));
    user.on('interacting', function (delta, state) {
      assert.equal(delta.active, 1);
      assert.isNaN(delta.x);
      assert.isNaN(delta.y);
      assert.isTrue(state.active);
      assert.equal(state.x, 1);
      assert.equal(state.y, 1);
      assert.equal(state.tool, 'MockTool');
      assert.equal(state.element, 'eid');
      assert.isOk(state.time);
      interacted = true;
    });
    user.interacting({ active : true, x : 1, y : 1, element : 'eid' });
    assert.isTrue(interacted);
  });

  it('should emit an interaction and quiescence if becoming inactive', function () {
    var picture = new Picture(MockPaper(10, 10));
    var user = new User({ id : 'uid' }), interacted = false, quiesced = false;
    user.use(new MockTool(picture));
    user.interacting({ active : true, x : 1, y : 1 });
    user.on('interacting', function (delta, state) {
      assert.equal(delta.active, -1);
      assert.equal(delta.x, -1);
      assert.equal(delta.y, -1);
      assert.isFalse(state.active);
      assert.equal(state.x, 0);
      assert.equal(state.y, 0);
      interacted = true;
    });
    user.on('quiesced', function () {
      quiesced = true;
    });
    user.interacting({ active : false, x : 0, y : 0 });
    assert.isTrue(interacted);
    assert.isTrue(quiesced);
  });

  it('should emit an interaction with key pressed', function () {
    var picture = new Picture(MockPaper(10, 10));
    var user = new User({ id : 'uid' }), interacted = false;
    user.use(new MockTool(picture));
    user.on('interacting', function (delta, state) {
      assert.equal(delta.char, '1');
      assert.equal(state.char, '1');
      interacted = true;
    });
    user.interacting({ active : true, char : '1' });
    assert.isTrue(interacted);
  });
});
