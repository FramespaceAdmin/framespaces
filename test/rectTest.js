var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Rect = require('../client/shape/rect'),
    MockSnap = require('./mockSnap');

describe('Rect', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var rect = new Rect({ x : 0, y : 0, width : 1, height : 1 });
      assert.equal(rect.name, 'rect');
      assert.equal(rect.points.length, 4);
      assert.equal(rect.extent, Math.sqrt(2));
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockSnap(10, 10);

    it('should have expected properties', function () {
      var rect = Shape.of(paper.rect(0, 0, 1, 1));
      assert.equal(rect.name, 'rect');
      assert.equal(rect.points.length, 4);
      assert.equal(rect.extent, Math.sqrt(2));
    });
  });
});
