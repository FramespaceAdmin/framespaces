var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Arc = require('../client/shape/arc'),
    Circle = require('../client/shape/circle'),
    Rect = require('../client/shape/rect'),
    Point = require('kld-affine').Point2D;

describe('Circle', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      assert.equal(circle.name, 'circle');
      assert.equal(circle.points.length, 1);
      assert.equal(circle.points[0].x, 1);
      assert.equal(circle.points[0].y, 1);
      assert.equal(circle.bbox.x, 0);
      assert.equal(circle.bbox.y, 0);
      assert.equal(circle.bbox.width, 2);
      assert.equal(circle.bbox.height, 2);
      assert.isTrue(circle.bbox.c.equals(new Point(1, 1)));
      assert.equal(circle.extent, 2);
    });

    it('should grow when moved by its edge', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var move = circle.mover(true, new Rect({ x : 1, y : 0, width : 0.1, height : 0.1 }));
      circle = move.call(circle, 0, -1, 1, -1);
      assert.isTrue(circle.points[0].equals(new Point(1, 1)));
      assert.equal(circle.attr.r, 2);
    });

    it('should minus to a large arc when a quarter is removed', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var fragments = circle.minus(new Rect({ x : 0, y : 0, width : 1, height : 1 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Arc);
      assert.isTrue(fragments[0].ends[0].equals(new Point(1, 0)));
      assert.isTrue(fragments[0].ends[1].equals(new Point(0, 1)));
      assert.isTrue(fragments[0].centre.equals(new Point(1, 1)));
      assert.isTrue(fragments[0].path[1].curve.largeArcFlag);
      assert.isTrue(fragments[0].path[1].curve.sweepFlag);
    });

    it('should minus to a small arc when a half is removed', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var fragments = circle.minus(new Rect({ x : 0, y : 0, width : 1, height : 2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Arc);
      assert.isTrue(fragments[0].ends[0].equals(new Point(1, 0)));
      assert.isTrue(fragments[0].ends[1].equals(new Point(1, 2)));
      assert.isTrue(fragments[0].centre.equals(new Point(1, 1)));
      assert.isFalse(fragments[0].path[1].curve.largeArcFlag);
      assert.isTrue(fragments[0].path[1].curve.sweepFlag);
    });

    it('should minus to nothing when occluded', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var fragments = circle.minus(new Rect({ x : -0.1, y : -0.1, width : 2.2, height : 2.2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 0);
    });

    it('should minus to itself when not overlapped', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var fragments = circle.minus(new Rect({ x : -0.1, y : -0.1, width : 0.2, height : 0.2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Circle);
      assert.isTrue(fragments[0].bbox.c.equals(new Point(1, 1)));
      assert.equal(fragments[0].attr.r, 1);
    });
  });
});
