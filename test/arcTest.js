var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Arc = require('../client/shape/arc'),
    Circle = require('../client/shape/circle'),
    Rect = require('../client/shape/rect'),
    Point = require('kld-affine').Point2D,
    MockPaper = require('./mockPaper');

var dPattern = exports.dPattern = function (d) {
  return new RegExp(d.replace(/~([0-9\.]+)/g, '$1[0-9]+').replace(/,?\s+/g, ',?\\s*'));
};

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
      assert.isNotOk(arc.path[1].curve.sweepFlag);
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
      assert.isOk(arc.path[1].curve.sweepFlag);
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
      var move = arc.mover(true, new Circle({ cx : 1, cy : 1, r : 0.1 }));
      arc = move.call(arc, 1, 1);
      assert.equal(arc.ends[0].x, 0);
      assert.equal(arc.ends[0].y, 0);
      assert.equal(arc.ends[1].x, 2);
      assert.equal(arc.ends[1].y, 2);
      assert.equal(arc.path[1].curve.rx, 2);
      assert.equal(arc.path[1].curve.ry, 2);
    });

    it('should sweep the other way when the line is moved to the opposite side', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 1 1' });
      var move = arc.mover(true, new Circle({ cx : 1/3, cy : 2/3, r : 0.2 }));
      arc = move.call(arc, 1/3, -1/3, 2/3, 1/3);
      assert.equal(arc.ends[0].x, 0);
      assert.equal(arc.ends[0].y, 0);
      assert.equal(arc.ends[1].x, 1);
      assert.equal(arc.ends[1].y, 1);
      assert.equal(arc.path[1].curve.sweepFlag, 1);
    });

    it('should become large when the line is moved further than the radius', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 1 1' });
      var move = arc.mover(true, new Circle({ cx : 1/3, cy : 2/3, r : 0.2 }));
      arc = move.call(arc, -1, 1, 1/3-1, 1+2/3);
      assert.equal(arc.ends[0].x, 0);
      assert.equal(arc.ends[0].y, 0);
      assert.equal(arc.ends[1].x, 1);
      assert.equal(arc.ends[1].y, 1);
      assert.equal(arc.path[1].curve.largeArcFlag, 1);
    });

    it('should be unaffected by an non-overlapping minus shape', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 2 0' }); // Semicircle below x axis
      var fragments = arc.minus(new Rect({ x : 0.5, y : 0, width : 1, height : 0.5 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      // Note large arc flag doesn't matter for a semi-circle
      assert.match(fragments[0].attr.d, dPattern('M0 0 A 1 1, 0, [01], 0, 2 0'));
    });

    it('should be completely minused by an occluding shape', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 2 0' }); // Semicircle below x axis
      var fragments = arc.minus(new Rect({ x : -1, y : -1, width : 4, height : 3 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 0);
    });

    it('should have its head minused', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 2 0' }); // Semicircle below x axis
      var fragments = arc.minus(new Rect({ x : -1, y : -1, width : 2, height : 2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Arc);
      assert.match(fragments[0].attr.d, dPattern('M1 1 A 1 1, 0, 0, 0, 2 0'));
    });

    it('should have its tail minused', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 2 0' }); // Semicircle below x axis
      var fragments = arc.minus(new Rect({ x : 1, y : -1, width : 2, height : 2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Arc);
      assert.match(fragments[0].attr.d, dPattern('M0 0 A 1 1, 0, 0, 0, 1 1'));
    });

    it('should have its middle minused', function () {
      var arc = new Arc({ d : 'M0 0 A 1 1, 0, 0, 0, 2 0' }); // Semicircle below x axis
      var fragments = arc.minus(new Rect({ x : 0.5, y : 0, width : 1, height : 1.01 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 2);
      assert.instanceOf(fragments[0], Arc);
      assert.match(fragments[0].attr.d, dPattern('M0 0 A 1 1, 0, 0, 0, 0.5 ~0.86'));
      assert.instanceOf(fragments[1], Arc);
      assert.match(fragments[1].attr.d, dPattern('M1.5 ~0.86 A 1 1, 0, 0, 0, 2 0'));
    });

    it('should stay large if angle > 180', function () {
      var arc = new Arc({ d : 'M0 1 A 1 1, 0, 1, 0, 1 0' }); // Three-quarter circle around 1,1
      var fragments = arc.minus(new Rect({ x : -0.1, y : 0.9, width : 0.2, height : 0.2 }));
      assert.isOk(fragments);
      assert.lengthOf(fragments, 1);
      assert.instanceOf(fragments[0], Arc);
      assert.isOk(fragments[0].path[1].curve.largeArcFlag);
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
