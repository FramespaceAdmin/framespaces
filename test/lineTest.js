var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Circle = require('../client/shape/circle'),
    MockPaper = require('./mockPaper');

describe('Line', function () {
  describe('with raw attributes', function () {
    it('should have expected properties', function () {
      var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
      assert.equal(line.name, 'line');
      assert.equal(line.points.length, 2);
      assert.equal(line.points[0].x, 0);
      assert.equal(line.points[0].y, 0);
      assert.equal(line.points[1].x, 1);
      assert.equal(line.points[1].y, 1);
      assert.equal(line.extent, Math.sqrt(2));
    });

    describe('when being delta\'d', function () {
      it('should apply numeric deltas', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 })
          .delta({ x1 : 1, y1 : 1, x2 : 1, y2 : 1 });
        assert.equal(line.points.length, 2);
        assert.equal(line.points[0].x, 1);
        assert.equal(line.points[0].y, 1);
        assert.equal(line.points[1].x, 2);
        assert.equal(line.points[1].y, 2);
      });

      it('should apply class deltas', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1, class : 'a' }).delta({ class : '-a b' });
        assert.equal(line.attr.class, 'b');
        assert.isFalse(line.hasClass('a'));
        assert.isTrue(line.hasClass('b'));
      });

      it('should apply class', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 }).delta({ class : 'a' });
        assert.equal(line.attr.class, 'a');
        assert.isTrue(line.hasClass('a'));
      });
    });

    describe('when being minused', function () {
      it('should be unchanged by a non-overlapping shape', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
        var fragments = line.minus(new Circle({ cx : 2, cy : 2, r : 0.5 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 1);
        assert.instanceOf(fragments[0], Line);
        assert.deepEqual(fragments[0].attr, line.attr);
      });

      it('should be unchanged by a shape touching its head', function () {
        var line = new Line({ x1 : 1, y1 : 0, x2 : 2, y2 : 0 });
        var fragments = line.minus(new Circle({ cx : 0, cy : 0, r : 1 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 1);
        assert.instanceOf(fragments[0], Line);
        assert.deepEqual(fragments[0].attr, line.attr);
      });

      it('should be removed by an occluding shape', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
        var fragments = line.minus(new Circle({ cx : 0.5, cy : 0, r : 2 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 0);
      });

      it('should have its tail minused', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 2, y2 : 0 });
        var fragments = line.minus(new Circle({ cx : 2, cy : 0, r : 0.5 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 1);
        assert.instanceOf(fragments[0], Line);
        assert.deepEqual(fragments[0].attr, { x1 : 0, y1 : 0, x2 : 1.5, y2 : 0 });
      });

      it('should have its head minused', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 2, y2 : 0 });
        var fragments = line.minus(new Circle({ cx : 0, cy : 0, r : 0.5 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 1);
        assert.instanceOf(fragments[0], Line);
        assert.deepEqual(fragments[0].attr, { x1 : 0.5, y1 : 0, x2 : 2, y2 : 0 });
      });

      it('should have its middle minused', function () {
        var line = new Line({ x1 : 0, y1 : 0, x2 : 2, y2 : 0 });
        var fragments = line.minus(new Circle({ cx : 1, cy : 0, r : 0.5 }));
        assert.isOk(fragments);
        assert.lengthOf(fragments, 2);
        assert.instanceOf(fragments[0], Line);
        assert.instanceOf(fragments[1], Line);
        assert.deepEqual(fragments[0].attr, { x1 : 0, y1 : 0, x2 : 0.5, y2 : 0 });
        assert.deepEqual(fragments[1].attr, { x1 : 1.5, y1 : 0, x2 : 2, y2 : 0 });
      });
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockPaper(10, 10);

    it('should have expected properties', function () {
      var line = Shape.fromElement(paper.line(0, 0, 1, 1));
      assert.equal(line.name, 'line');
      assert.equal(line.points.length, 2);
      assert.equal(line.points[0].x, 0);
      assert.equal(line.points[0].y, 0);
      assert.equal(line.points[1].x, 1);
      assert.equal(line.points[1].y, 1);
      assert.equal(line.extent, Math.sqrt(2));
    });

    it('should handle raw SVG elements', function () {
      var line = Shape.fromElement(paper.line(0, 0, 1, 1).node);
      assert.equal(line.name, 'line');
      assert.equal(line.points.length, 2);
    });

    it('should add itself to paper', function () {
      var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
      var e = line.addTo(paper);
      assert.equal(e.node.nodeName, 'line');
      assert.equal(e.node.getAttribute('x1'), '0');
      assert.equal(e.node.getAttribute('y1'), '0');
      assert.equal(e.node.getAttribute('x2'), '1');
      assert.equal(e.node.getAttribute('y2'), '1');
    });

    it('should add itself to a raw SVG element', function () {
      var line = new Line({ x1 : 0, y1 : 0, x2 : 1, y2 : 1 });
      var node = line.addTo(paper.node);
      assert.equal(node.nodeName, 'line');
      assert.equal(node.getAttribute('x1'), '0');
      assert.equal(node.getAttribute('y1'), '0');
      assert.equal(node.getAttribute('x2'), '1');
      assert.equal(node.getAttribute('y2'), '1');
    });

    it('should apply itself to an existing line', function () {
      var line = new Line({ x1 : 1, y1 : 1, x2 : 2, y2 : 2 });
      var e = line.applyTo(paper.line(0, 0, 1, 1));
      assert.equal(e.node.nodeName, 'line');
      assert.equal(e.node.getAttribute('x1'), '1');
      assert.equal(e.node.getAttribute('y1'), '1');
      assert.equal(e.node.getAttribute('x2'), '2');
      assert.equal(e.node.getAttribute('y2'), '2');
    });

    it('should apply itself to an existing raw SVG line', function () {
      var line = new Line({ x1 : 1, y1 : 1, x2 : 2, y2 : 2 });
      var node = line.applyTo(paper.line(0, 0, 1, 1).node);
      assert.equal(node.nodeName, 'line');
      assert.equal(node.getAttribute('x1'), '1');
      assert.equal(node.getAttribute('y1'), '1');
      assert.equal(node.getAttribute('x2'), '2');
      assert.equal(node.getAttribute('y2'), '2');
    });
  });
});
