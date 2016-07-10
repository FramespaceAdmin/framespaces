var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Arc = require('../client/shape/arc'),
    Point = require('kld-affine').Point2D,
    MockPaper = require('./mockPaper');

describe('Arc', function () {
  describe('with raw attributes', function () {
    // Examples simplified from Mozilla tutorial
    // @see https://developer.mozilla.org/en/docs/Web/SVG/Tutorial/Paths#Arcs

    it('should have expected properties for small arc and negative angle', function () {
      var arc = new Arc({ d : 'M1 1 A 1 1, 0, 0, 0, 2 2' });
      assert.equal(arc.name, 'path');
      assert.equal(arc.points.length, 2);
      assert.equal(arc.points[0].x, 1);
      assert.equal(arc.points[0].y, 1);
      assert.equal(arc.points[1].x, 2);
      assert.equal(arc.points[1].y, 2);
      assert.equal(arc.bbox.x, 1);
      assert.equal(arc.bbox.y, 1);
      assert.equal(arc.bbox.width, 1);
      assert.equal(arc.bbox.height, 1);
      assert.equal(arc.extent, Math.sqrt(2));
      assert.isNotOk(arc.curve.sweepFlag);
    });

    it('should have expected properties for large arc and negative angle', function () {
      var arc = new Arc({ d : 'M1 1 A 1 1, 0, 1, 0, 2 2' });
      assert.equal(arc.name, 'path');
      assert.equal(arc.points.length, 2);
      assert.equal(arc.points[0].x, 1);
      assert.equal(arc.points[0].y, 1);
      assert.equal(arc.points[1].x, 2);
      assert.equal(arc.points[1].y, 2);
      assert.equal(arc.bbox.x, 0);
      assert.equal(arc.bbox.y, 1);
      assert.equal(arc.bbox.width, 2);
      assert.equal(arc.bbox.height, 2);
      assert.equal(arc.extent, 2); // rx + ry
    });

    it('should have expected properties for small arc and positive angle', function () {
      var arc = new Arc({ d : 'M1 1 A 1 1, 0, 0, 1, 2 2' });
      assert.equal(arc.name, 'path');
      assert.equal(arc.points.length, 2);
      assert.equal(arc.points[0].x, 1);
      assert.equal(arc.points[0].y, 1);
      assert.equal(arc.points[1].x, 2);
      assert.equal(arc.points[1].y, 2);
      assert.equal(arc.bbox.x, 1);
      assert.equal(arc.bbox.y, 1);
      assert.equal(arc.bbox.width, 1);
      assert.equal(arc.bbox.height, 1);
      assert.equal(arc.extent, Math.sqrt(2));
      assert.isOk(arc.curve.sweepFlag);
    });

    it('should have expected properties for large arc and positive angle', function () {
      var arc = new Arc({ d : 'M1 1 A 1 1, 0, 1, 1, 2 2' });
      assert.equal(arc.name, 'path');
      assert.equal(arc.points.length, 2);
      assert.equal(arc.points[0].x, 1);
      assert.equal(arc.points[0].y, 1);
      assert.equal(arc.points[1].x, 2);
      assert.equal(arc.points[1].y, 2);
      assert.equal(arc.bbox.x, 1);
      assert.equal(arc.bbox.y, 0);
      assert.equal(arc.bbox.width, 2);
      assert.equal(arc.bbox.height, 2);
      assert.equal(arc.extent, 2); // rx + ry
    });

    it('should stay in proportion when an end is moved', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 1 1' });
      var move = arc.mover(true, { c : new Point(1, 1), r : 0.1 });
      arc = move.call(arc, 1, 1);
      assert.equal(arc.p1.x, 0);
      assert.equal(arc.p1.y, 0);
      assert.equal(arc.p2.x, 2);
      assert.equal(arc.p2.y, 2);
      assert.equal(arc.curve.rx, 2);
      assert.equal(arc.curve.ry, 2);
    });

    it('should sweep the other way when the line is moved to the opposite side', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 1 1' });
      var move = arc.mover(true, { c : new Point(1/3, 2/3), r : 0.2 });
      arc = move.call(arc, 1/3, -1/3, 2/3, 1/3);
      assert.equal(arc.p1.x, 0);
      assert.equal(arc.p1.y, 0);
      assert.equal(arc.p2.x, 1);
      assert.equal(arc.p2.y, 1);
      assert.equal(arc.curve.sweepFlag, 1);
    });

    it('should become large when the line is moved further than the radius', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 1 1' });
      var move = arc.mover(true, { c : new Point(1/3, 2/3), r : 0.2 });
      arc = move.call(arc, -1, 1, 1/3-1, 1+2/3);
      assert.equal(arc.p1.x, 0);
      assert.equal(arc.p1.y, 0);
      assert.equal(arc.p2.x, 1);
      assert.equal(arc.p2.y, 1);
      assert.equal(arc.curve.largeArcFlag, 1);
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockPaper(10, 10);

    it('should have expected properties', function () {
      var arc = Shape.of(paper.path('M1 1 A 1 1, 0, 0, 0, 2 2'));
      assert.equal(arc.name, 'path');
      assert.equal(arc.points.length, 2);
      assert.equal(arc.extent, Math.sqrt(2));
    });
  });
});
