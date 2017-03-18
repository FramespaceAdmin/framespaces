var _ = require('lodash'),
    assert = require('chai').assert,
    Point = require('kld-affine').Point2D,
    Matrix = require('kld-affine').Matrix2D,
    Shape = require('../client/shape'),
    Circle = require('../client/shape/circle'),
    Rect = require('../client/shape/rect'),
    MockPaper = require('./mockPaper');

describe('Rect', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var rect = new Rect({ x : 0, y : 0, width : 1, height : 1 });
      assert.equal(rect.name, 'rect');
      assert.equal(rect.points.length, 4);
      assert.equal(rect.points[0].x, 0);
      assert.equal(rect.points[0].y, 0);
      assert.equal(rect.extent, Math.sqrt(2));
    });

    it('should contain a point inside it', function () {
      var rect = new Rect({ x : 0, y : 0, width : 2, height : 2 });
      assert.isOk(rect.contains(new Point(1, 1)));
    });

    it('should contain a point on its edge', function () {
      var rect = new Rect({ x : 0, y : 0, width : 2, height : 2 });
      assert.isOk(rect.contains(new Point(0, 1)));
    });

    it('should not contain a point outside it', function () {
      var rect = new Rect({ x : 0, y : 0, width : 1, height : 1 });
      assert.isNotOk(rect.contains(new Point(2, 2)));
    });

    it('should present the correct matrix', function () {
      var rect = new Rect({ x : 1, y : 1, width : 1, height : 1 });
      assert.isTrue(rect.matrix().equals(Matrix.IDENTITY.translate(1, 1).scaleNonUniform(1, 1)));
    });

    describe('transforming', function () {
      it('should not change with identity', function () {
        var rect = new Rect({ x : 0, y : 0, width : 1, height : 1 }).transform(Matrix.IDENTITY);
        assert.equal(rect.attr.x, 0);
        assert.equal(rect.attr.y, 0);
        assert.equal(rect.attr.width, 1);
        assert.equal(rect.attr.height, 1);
      });

      it('should scale', function () {
        var rect = new Rect({ x : 0, y : 0, width : 1, height : 1 }).transform(Matrix.IDENTITY.scale(2));
        assert.equal(rect.attr.x, 0);
        assert.equal(rect.attr.y, 0);
        assert.equal(rect.attr.width, 2);
        assert.equal(rect.attr.height, 2);
      });

      it('should translate', function () {
        var rect = new Rect({ x : 0, y : 0, width : 1, height : 1 }).transform(Matrix.IDENTITY.translate(1, 1));
        assert.equal(rect.attr.x, 1);
        assert.equal(rect.attr.y, 1);
        assert.equal(rect.attr.width, 1);
        assert.equal(rect.attr.height, 1);
      });
    });

    it('should move its body', function () {
      var rect = new Rect({ x : 0, y : 0, width : 2, height : 2 });
      var move = rect.mover(false, new Circle({ cx : 1, cy : 1, r : 0.5 }));
      rect = move.call(rect, 1, 1);
      assert.equal(rect.attr.x, 1);
      assert.equal(rect.attr.y, 1);
    });

    it('should move its top-left corner', function () {
      var rect = new Rect({ x : 0, y : 0, width : 2, height : 2 });
      var move = rect.mover(true, new Circle({ cx : 0, cy : 0, r : 0.5 }));
      rect = move.call(rect, 1, 1);
      assert.equal(rect.attr.x, 1);
      assert.equal(rect.attr.y, 1);
      assert.equal(rect.attr.width, 1);
      assert.equal(rect.attr.height, 1);
    });

    it('should move its right side', function () {
      var rect = new Rect({ x : 0, y : 0, width : 2, height : 2 });
      var move = rect.mover(true, new Circle({ cx : 2, cy : 1, r : 0.5 }));
      rect = move.call(rect, 1, 0);
      assert.equal(rect.attr.x, 0);
      assert.equal(rect.attr.y, 0);
      assert.equal(rect.attr.width, 3);
      assert.equal(rect.attr.height, 2);
    });

    it('should switch sides when width < 0', function () {
      var rect = new Rect({ x : 1, y : 0, width : 1, height : 2 });
      var move = rect.mover(true, new Circle({ cx : 2, cy : 1, r : 0.5 }));
      rect = move.call(rect, -2, 0);
      assert.equal(rect.attr.x, 0);
      assert.equal(rect.attr.y, 0);
      assert.equal(rect.attr.width, 1);
      assert.equal(rect.attr.height, 2);
    });

    it('should stay switched when width stays < 0', function () {
      var rect = new Rect({ x : 1, y : 0, width : 1, height : 2 });
      var move = rect.mover(true, new Circle({ cx : 2, cy : 1, r : 0.5 }));
      rect = move.call(rect, -2, 0);
      rect = move.call(rect, -2, 0);
      assert.equal(rect.attr.x, -2);
      assert.equal(rect.attr.y, 0);
      assert.equal(rect.attr.width, 3);
      assert.equal(rect.attr.height, 2);
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockPaper(10, 10);

    it('should have expected properties', function () {
      var rect = Shape.of(paper.rect(0, 0, 1, 1));
      assert.equal(rect.name, 'rect');
      assert.equal(rect.points.length, 4);
      assert.equal(rect.points[0].x, 0);
      assert.equal(rect.points[0].y, 0);
      assert.equal(rect.extent, Math.sqrt(2));
    });
  });
});
