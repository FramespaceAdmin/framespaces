var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Polygon = require('../client/shape/polygon'),
    Polyline = require('../client/shape/polyline'),
    Rect = require('../client/shape/rect'),
    MockPaper = require('./mockPaper');

describe('Polygon', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var polygon = new Polygon({ points : '0,0,1,0,1,1,0,1' });
      assert.equal(polygon.name, 'polygon');
      assert.equal(polygon.getPoints().length, 4);
      assert.equal(polygon.getExtent(), Math.sqrt(2));
    });

    it('should disappear when minused with an occluding shape', function () {
      var polygon = new Polygon({ points : '1,1,2,1,2,2,1,2' });
      var fragments = polygon.minus(new Rect({ x : 0, y : 0, width : 4, height : 4 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 0);
    });

    it('should be unchanged when minused with a non-overlapping shape', function () {
      var polygon = new Polygon({ points : '1,1,2,1,2,2,1,2' });
      var fragments = polygon.minus(new Rect({ x : 5, y : 5, width : 1, height : 1 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Polygon);
      assert.deepEqual(fragments[0].getPoints(), polygon.getPoints());
    });

    it('should become a polyline when minused with shape over an end', function () {
      var polygon = new Polygon({ points : '0,0,2,0,2,2,0,2' });
      var fragments = polygon.minus(new Rect({ x : -1, y : -1, width : 2, height : 2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Polyline);
      assert.deepEqual(fragments[0].getPoints(), Polyline.points('1,0,2,0,2,2,0,2,0,1'));
    });

    it('should become a polyline when minused with shape over a point', function () {
      var polygon = new Polygon({ points : '0,0,2,0,2,2,0,2' });
      var fragments = polygon.minus(new Rect({ x : 1, y : -1, width : 2, height : 2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Polyline);
      assert.deepEqual(fragments[0].getPoints(), Polyline.points('2,1,2,2,0,2,0,0,1,0'));
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockPaper(10, 10);

    it('should have expected properties', function () {
      var polygon = Shape.of(paper.polygon(0, 0, 1, 0, 1, 1, 0, 1));
      assert.equal(polygon.name, 'polygon');
      assert.equal(polygon.getPoints().length, 4);
      assert.equal(polygon.getExtent(), Math.sqrt(2));
    });
  });
});
