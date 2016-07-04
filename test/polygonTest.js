var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Polygon = require('../client/shape/polygon'),
    MockSnap = require('./mockSnap');

describe('Polygon', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var polygon = new Polygon({ points : '0,0,1,0,1,1,0,1' });
      assert.equal(polygon.name, 'polygon');
      assert.equal(polygon.points.length, 4);
      assert.equal(polygon.extent, Math.sqrt(2));
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockSnap(10, 10);

    it('should have expected properties', function () {
      var polygon = Shape.of(paper.polygon(0, 0, 1, 0, 1, 1, 0, 1));
      assert.equal(polygon.name, 'polygon');
      assert.equal(polygon.points.length, 4);
      assert.equal(polygon.extent, Math.sqrt(2));
    });
  });
});
