var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Circle = require('../client/shape/circle'),
    Rect = require('../client/shape/rect'),
    Line = require('../client/shape/line'),
    Polyline = require('../client/shape/polyline'),
    MockPaper = require('./mockPaper');

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

    describe('when recty', function () {
      it('should have expected properties', function () {
        var polyline = new Polyline({ points : '0,0,0,2,2,2' });
        assert.equal(polyline.axis, 'y');
      });

      it('should stay recty when a point is dragged', function () {
        var polyline = new Polyline({ points : '0,0,0,2,2,2' });
        var move = polyline.mover(true, new Circle({ cx : 0, cy : 2, r : 0.5 }));
        polyline = move.call(polyline, 1, 1);
        assert.equal(polyline.points[0].x, 1);
        assert.equal(polyline.points[0].y, 0);
        assert.equal(polyline.points[1].x, 1);
        assert.equal(polyline.points[1].y, 3);
        assert.equal(polyline.points[2].x, 2);
        assert.equal(polyline.points[2].y, 3);
      });

      it('should stay recty when a segment is dragged', function () {
        var polyline = new Polyline({ points : '0,0,0,2,2,2' });
        var move = polyline.mover(true, new Circle({ cx : 0, cy : 1, r : 0.5 }));
        polyline = move.call(polyline, 1, 1);
        assert.equal(polyline.points[0].x, 1);
        assert.equal(polyline.points[0].y, 0);
        assert.equal(polyline.points[1].x, 1);
        assert.equal(polyline.points[1].y, 2);
        assert.equal(polyline.points[2].x, 2);
        assert.equal(polyline.points[2].y, 2);
      });

      it('should close to a rectangle if three points', function () {
        var polyline = new Polyline({ points : '0,0,0,2,2,2' });
        rect = polyline.close();
        assert.instanceOf(rect, Rect);
        assert.equal(rect.attr.x, 0);
        assert.equal(rect.attr.y, 0);
        assert.equal(rect.attr.width, 2);
        assert.equal(rect.attr.height, 2);
      });

      it('should close to a rectangle if four points', function () {
        var polyline = new Polyline({ points : '0,0,0,2,2,2,2,0' });
        rect = polyline.close();
        assert.instanceOf(rect, Rect);
        assert.equal(rect.attr.x, 0);
        assert.equal(rect.attr.y, 0);
        assert.equal(rect.attr.width, 2);
        assert.equal(rect.attr.height, 2);
      });

      it('should favour the first point when closing to a rectangle', function () {
        var polyline = new Polyline({ points : '0,0,0,2,2,2,2,-1' });
        rect = polyline.close();
        assert.instanceOf(rect, Rect);
        assert.equal(rect.attr.x, 0);
        assert.equal(rect.attr.y, 0);
        assert.equal(rect.attr.width, 2);
        assert.equal(rect.attr.height, 2);
      });

      it('should close to a rectangle if five points', function () {
        var polyline = new Polyline({ points : '0,0,0,2,2,2,2,-1,1,-1' });
        rect = polyline.close();
        assert.instanceOf(rect, Rect);
        assert.equal(rect.attr.x, 0);
        assert.equal(rect.attr.y, 0);
        assert.equal(rect.attr.width, 2);
        assert.equal(rect.attr.height, 2);
      });
    });

    describe('when being erased', function () {
      it('should be unaffected by a non-overlapping cursor', function () {
        var polyline = new Polyline({ points : '0,0,2,0,2,2' });
        var fragments = polyline.minus(new Circle({ cx : 0, cy : 2, r : 0.5 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 1);
        assert.deepEqual(fragments[0].attr, polyline.attr);
      });

      it('should be removed by an occluding cursor', function () {
        var polyline = new Polyline({ points : '0,0,2,0,2,2' });
        var fragments = polyline.minus(new Circle({ cx : 1, cy : 1, r : 2 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 0);
      });

      it('should have its head removed', function () {
        var polyline = new Polyline({ points : '0,0,2,0,2,2' });
        var fragments = polyline.minus(new Circle({ cx : 0, cy : 0, r : 1 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 1);
        assert.equal(fragments[0].attr.points, '1,0,2,0,2,2');
      });

      it('should have its tail removed', function () {
        var polyline = new Polyline({ points : '0,0,2,0,2,2' });
        var fragments = polyline.minus(new Circle({ cx : 2, cy : 2, r : 1 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 1);
        assert.equal(fragments[0].attr.points, '0,0,2,0,2,1');
      });

      it('should have an intermediate point removed', function () {
        var polyline = new Polyline({ points : '0,0,2,0,2,2' });
        var fragments = polyline.minus(new Circle({ cx : 2, cy : 0, r : 1 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 2);
        assert.instanceOf(fragments[0], Line);
        assert.deepEqual(fragments[0].attr, { x1 : 0, y1 : 0, x2 : 1, y2 : 0 });
        assert.instanceOf(fragments[1], Line);
        assert.deepEqual(fragments[1].attr, { x1 : 2, y1 : 1, x2 : 2, y2 : 2 });
      });

      it('should have the middle of an intermediate line removed', function () {
        var polyline = new Polyline({ points : '0,0,2,0,2,2' });
        var fragments = polyline.minus(new Circle({ cx : 1, cy : 0, r : 0.5 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 2);
        assert.instanceOf(fragments[0], Line);
        assert.deepEqual(fragments[0].attr, { x1 : 0, y1 : 0, x2 : 0.5, y2 : 0 });
        assert.instanceOf(fragments[1], Polyline);
        assert.equal(fragments[1].attr.points, '1.5,0,2,0,2,2');
      });
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockPaper(10, 10);

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
