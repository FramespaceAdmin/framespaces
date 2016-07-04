var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Arc = require('../client/shape/arc'),
    MockSnap = require('./mockSnap');

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
  });

  describe('with a Snap.svg element', function () {
    var paper = MockSnap(10, 10);

    it('should have expected properties', function () {
      var arc = Shape.of(paper.path('M1 1 A 1 1, 0, 0, 0, 2 2'));
      assert.equal(arc.name, 'path');
      assert.equal(arc.points.length, 2);
      assert.equal(arc.extent, Math.sqrt(2));
    });
  });
});
