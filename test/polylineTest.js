var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Polyline = require('../client/shape/polyline'),
    MockSnap = require('./mockSnap');

describe('Polyline', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var polyline = new Polyline({ points : '0,0,1,1' });
      assert.equal(polyline.name, 'polyline');
      assert.equal(polyline.points.length, 2);
      assert.equal(polyline.points[0].x, 0);
      assert.equal(polyline.points[0].y, 0);
      assert.equal(polyline.points[1].x, 1);
      assert.equal(polyline.points[1].y, 1);
      assert.equal(polyline.extent, Math.sqrt(2));
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockSnap(10, 10);

    it('should have expected properties', function () {
      var polyline = Shape.of(paper.polyline(0, 0, 1, 1));
      assert.equal(polyline.name, 'polyline');
      assert.equal(polyline.points.length, 2);
      assert.equal(polyline.points[0].x, 0);
      assert.equal(polyline.points[0].y, 0);
      assert.equal(polyline.points[1].x, 1);
      assert.equal(polyline.points[1].y, 1);
      assert.equal(polyline.extent, Math.sqrt(2));
    });
  });
});
