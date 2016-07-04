var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    MockSnap = require('./mockSnap');

describe('Line', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
      assert.equal(line.name, 'line');
      assert.equal(line.points.length, 2);
      assert.equal(line.points[0].x, 0);
      assert.equal(line.points[0].y, 0);
      assert.equal(line.points[1].x, 1);
      assert.equal(line.points[1].y, 1);
      assert.equal(line.extent, Math.sqrt(2));
    });

    it('should apply numeric deltas', function () {
      var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 })
        .delta({ x1 : 1, y1 : 1, x2 : 1, y2 : 1 });
      assert.equal(line.points.length, 2);
      assert.equal(line.points[0].x, 1);
      assert.equal(line.points[0].y, 1);
      assert.equal(line.points[1].x, 2);
      assert.equal(line.points[1].y, 2);
    });

    it('should apply class deltas', function () {
      var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1, class : 'a' }).delta({ class : '-a b' });
      assert.equal(line.attr.class, 'b');
      assert.isFalse(line.hasClass('a'));
      assert.isTrue(line.hasClass('b'));
    });

    it('should apply class', function () {
      var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 }).delta({ class : 'a' });
      assert.equal(line.attr.class, 'a');
      assert.isTrue(line.hasClass('a'));
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockSnap(10, 10);

    it('should have expected properties', function () {
      var line = Shape.of(paper.line(0, 0, 1, 1));
      assert.equal(line.name, 'line');
      assert.equal(line.points.length, 2);
      assert.equal(line.points[0].x, 0);
      assert.equal(line.points[0].y, 0);
      assert.equal(line.points[1].x, 1);
      assert.equal(line.points[1].y, 1);
      assert.equal(line.extent, Math.sqrt(2));
    });
  });
});
