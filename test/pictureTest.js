var _ = require('lodash'),
    assert = require('chai').assert,
    guid = require('../lib/guid'),
    Picture = require('../client/picture'),
    Line = require('../client/shape/line'),
    MockSnap = require('./mockSnap');

describe('Picture', function () {
  it('should get an element by id', function () {
    var paper = MockSnap(10, 10), picture = new Picture(paper), id = guid();
    var line = paper.line(0, 0, 1, 1).attr('id', id);
    assert.equal(picture.getElement(id), line);
  });

  it('should perform addition', function () {
    var paper = MockSnap(10, 10), picture = new Picture(paper);
    var shape = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
    var action = picture.action.addition(shape);
    assert.isOk(action.isOK());
    var line = action();
    assert.equal(shape.attr.id, line.attr('id'));
  });

  it('should undo addition', function () {
    var paper = MockSnap(10, 10), picture = new Picture(paper);
    var shape = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
    var action = picture.action.addition(shape);
    action();
    assert.isOk(action.undo.isOK());
    var line = action.undo();
    assert.equal(shape.attr.id, line.attr('id'));
    assert.isOk(line.removed);
  });

  it('should perform removal', function () {
    var paper = MockSnap(10, 10), picture = new Picture(paper), id = guid();
    var addedLine = paper.line(0, 0, 1, 1).attr('id', id);
    var action = picture.action.removal(addedLine);
    assert.isOk(action.isOK());
    var removedLine = action();
    assert.equal(addedLine, removedLine);
    assert.isOk(removedLine.removed);
  });

  it('should undo removal', function () {
    var paper = MockSnap(10, 10), picture = new Picture(paper), id = guid();
    var action = picture.action.removal(paper.line(0, 0, 1, 1).attr('id', id));
    action();
    assert.isOk(action.undo.isOK());
    var recoveredLine = action.undo();
    assert.equal(id, recoveredLine.attr('id'));
    assert.equal(0, recoveredLine.attr('x1'));
    assert.isNotOk(recoveredLine.removed);
  });
});
