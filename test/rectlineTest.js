var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Circle = require('../client/shape/circle'),
    Point = require('kld-affine').Point2D,
    Rectline = require('../client/shape/rectline'),
    Rect = require('../client/shape/rect'),
    MockPaper = require('./mockPaper');

describe('Rectline', function () {
  it('should have expected properties', function () {
    var rectline = new Rectline({ points : '0,0,0,2,2,2' });
    assert.equal(rectline.name, 'polyline');
    assert.equal(rectline.points.length, 3);
    assert.equal(rectline.extent, Math.sqrt(8));
  });

  it('should be recognised', function () {
    var paper = MockPaper(10, 10);
    var rectline = Shape.of(paper.polyline(0, 0, 0, 2, 2, 2));
    assert.instanceOf(rectline, Rectline);
    assert.equal(rectline.name, 'polyline');
    assert.equal(rectline.points.length, 3);
  });

  it('should stay recty when a point is dragged', function () {
    var rectline = new Rectline({ points : '0,0,0,2,2,2' });
    var move = rectline.mover(true, new Circle({ cx : 0, cy : 2, r : 0.5 }));
    rectline = move.call(rectline, 1, 1);
    assert.equal(rectline.points[0].x, 1);
    assert.equal(rectline.points[0].y, 0);
    assert.equal(rectline.points[1].x, 1);
    assert.equal(rectline.points[1].y, 3);
    assert.equal(rectline.points[2].x, 2);
    assert.equal(rectline.points[2].y, 3);
  });

  it('should stay recty when a segment is dragged', function () {
    var rectline = new Rectline({ points : '0,0,0,2,2,2' });
    var move = rectline.mover(true, new Circle({ cx : 0, cy : 1, r : 0.5 }));
    rectline = move.call(rectline, 1, 1);
    assert.equal(rectline.points[0].x, 1);
    assert.equal(rectline.points[0].y, 0);
    assert.equal(rectline.points[1].x, 1);
    assert.equal(rectline.points[1].y, 2);
    assert.equal(rectline.points[2].x, 2);
    assert.equal(rectline.points[2].y, 2);
  });

  it('should close to a rectangle if three points', function () {
    var rectline = new Rectline({ points : '0,0,0,2,2,2' });
    rect = rectline.close();
    assert.instanceOf(rect, Rect);
    assert.equal(rect.attr.x, 0);
    assert.equal(rect.attr.y, 0);
    assert.equal(rect.attr.width, 2);
    assert.equal(rect.attr.height, 2);
  });

  it('should close to a rectangle if four points', function () {
    var rectline = new Rectline({ points : '0,0,0,2,2,2,2,0' });
    rect = rectline.close();
    assert.instanceOf(rect, Rect);
    assert.equal(rect.attr.x, 0);
    assert.equal(rect.attr.y, 0);
    assert.equal(rect.attr.width, 2);
    assert.equal(rect.attr.height, 2);
  });

  it('should favour the first point when closing to a rectangle', function () {
    var rectline = new Rectline({ points : '0,0,0,2,2,2,2,-1' });
    rect = rectline.close();
    assert.instanceOf(rect, Rect);
    assert.equal(rect.attr.x, 0);
    assert.equal(rect.attr.y, 0);
    assert.equal(rect.attr.width, 2);
    assert.equal(rect.attr.height, 2);
  });

  it('should close to a rectangle if five points', function () {
    var rectline = new Rectline({ points : '0,0,0,2,2,2,2,-1,1,-1' });
    rect = rectline.close();
    assert.instanceOf(rect, Rect);
    assert.equal(rect.attr.x, 0);
    assert.equal(rect.attr.y, 0);
    assert.equal(rect.attr.width, 2);
    assert.equal(rect.attr.height, 2);
  });
});
