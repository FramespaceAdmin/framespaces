var _ = require('lodash'),
    assert = require('chai').assert,
    Point = require('kld-affine').Point2D,
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
