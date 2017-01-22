var _ = require('lodash'),
    assert = require('chai').assert,
    guid = require('../lib/guid'),
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Addition = require('../client/action/addition'),
    Removal = require('../client/action/removal'),
    MockPaper = require('./mockPaper');

describe('Actions:', function () {
  describe('Addition', function () {
    it('should do', function () {
      var paper = MockPaper(10, 10), picture = new Picture(paper);
      var shape = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1, id : guid() });
      var action = new Addition(shape);
      assert.isOk(action.isOK(picture));
      var line = action.do(picture);
      assert.equal(shape.attr.id, line.attr('id'));
    });

    it('should undo', function () {
      var paper = MockPaper(10, 10), picture = new Picture(paper);
      var shape = new Line({ id : guid(), x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
      var action = new Addition(shape);
      action.do(picture);
      assert.isOk(action.un().isOK(picture));
      var line = action.un().do(picture);
      assert.equal(shape.attr.id, line.attr('id'));
      assert.isOk(line.removed);
    });
  });

  describe('Removal', function () {
    it('should do', function () {
      var paper = MockPaper(10, 10), picture = new Picture(paper), id = guid();
      var addedLine = paper.line(0, 0, 1, 1).attr('id', id);
      var action = new Removal(Shape.of(addedLine));
      assert.isOk(action.isOK(picture));
      var removedLine = action.do(picture);
      assert.equal(addedLine, removedLine);
      assert.isOk(removedLine.removed);
    });

    it('should undo', function () {
      var paper = MockPaper(10, 10), picture = new Picture(paper), id = guid();
      var action = new Removal(Shape.of(paper.line(0, 0, 1, 1).attr('id', id)));
      action.do(picture);
      assert.isOk(action.un().isOK(picture));
      var recoveredLine = action.un().do(picture);
      assert.equal(id, recoveredLine.attr('id'));
      assert.equal(0, recoveredLine.attr('x1'));
      assert.isNotOk(recoveredLine.removed);
    });
  });
});
