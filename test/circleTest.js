var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Arc = require('../client/shape/arc'),
    Circle = require('../client/shape/circle'),
    Matrix = require('kld-affine').Matrix2D,
    Rect = require('../client/shape/rect'),
    Point = require('kld-affine').Point2D;

describe('Circle', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      assert.equal(circle.name, 'circle');
      assert.equal(circle.getPoints().length, 4);
      assert.equal(circle.getPoints()[0].x, 1);
      assert.equal(circle.getPoints()[0].y, 0);
      assert.equal(circle.getPoints()[1].x, 2);
      assert.equal(circle.getPoints()[1].y, 1);
      assert.equal(circle.getPoints()[2].x, 1);
      assert.equal(circle.getPoints()[2].y, 2);
      assert.equal(circle.getPoints()[3].x, 0);
      assert.equal(circle.getPoints()[3].y, 1);
      assert.equal(circle.getBBox().x, 0);
      assert.equal(circle.getBBox().y, 0);
      assert.equal(circle.getBBox().width, 2);
      assert.equal(circle.getBBox().height, 2);
      assert.isTrue(circle.getBBox().c.equals(new Point(1, 1)));
      assert.equal(circle.getExtent(), 2);
    });

    describe('transforming', function () {
      it('should not change with identity', function () {
        var circle = new Circle({ cx : 1, cy : 1, r : 1 }).transform(Matrix.IDENTITY);
        assert.equal(circle.attr.cx, 1);
        assert.equal(circle.attr.cy, 1);
        assert.equal(circle.attr.r, 1);
      });

      it('should scale', function () {
        var circle = new Circle({ cx : 1, cy : 1, r : 1 }).transform(Matrix.IDENTITY.scale(2));
        assert.equal(circle.attr.cx, 2);
        assert.equal(circle.attr.cy, 2);
        assert.equal(circle.attr.r, 2);
      });

      it('should translate', function () {
        var circle = new Circle({ cx : 1, cy : 1, r : 1 }).transform(Matrix.IDENTITY.translate(1, 1));
        assert.equal(circle.attr.cx, 2);
        assert.equal(circle.attr.cy, 2);
        assert.equal(circle.attr.r, 1);
      });
    });

    it('should grow when moved by its edge', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var move = circle.mover(true, new Rect({ x : 1, y : 0, width : 0.1, height : 0.1 }));
      circle = move.call(circle, 0, -1, 1, -1);
      assert.equal(circle.attr.cx, 1);
      assert.equal(circle.attr.cy, 1);
      assert.equal(circle.attr.r, 2);
    });

    it('should minus to a large arc when a quarter is removed', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var fragments = circle.minus(new Rect({ x : 0, y : 0, width : 1, height : 1 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Arc);
      assert.isTrue(fragments[0].getEnds()[0].equals(new Point(1, 0)));
      assert.isTrue(fragments[0].getEnds()[1].equals(new Point(0, 1)));
      assert.isTrue(fragments[0].getCentre().equals(new Point(1, 1)));
      assert.isTrue(fragments[0].path[1].curve.largeArcFlag);
      assert.isTrue(fragments[0].path[1].curve.sweepFlag);
    });

    it('should minus to a small arc when a half is removed', function () {
      var circle = new Circle({ cx : 1, cy : 1, r : 1 });
      var fragments = circle.minus(new Rect({ x : 0, y : 0, width : 1, height : 2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Arc);
      assert.isTrue(fragments[0].getEnds()[0].equals(new Point(1, 0)));
      assert.isTrue(fragments[0].getEnds()[1].equals(new Point(1, 2)));
      assert.isTrue(fragments[0].getCentre().equals(new Point(1, 1)));
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

    it('should contain a square', function () {
      var circle = new Circle({ cx : 0.5, cy : 0.5, r : 2 });
      var square = new Rect({ x : 0, y : 0, width : 1, height : 1 })
      assert.isTrue(circle.contains(square));
    });
  });
});
