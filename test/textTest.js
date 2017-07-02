var _ = require('lodash'),
    assert = require('chai').assert,
    Matrix = require('kld-affine').Matrix2D,
    Shape = require('../client/shape'),
    Text = require('../client/shape/text'),
    MockPaper = require('./mockPaper');

describe('Text', function () {
  describe('with raw attributes', function () {
    it('should represent text', function () {
      var tspans = [new Text.Span({ x : 0, y : 0 }, 'hello', { x : 0, y : 0, width : 1, height : 1 })];
      var text = new Text({ x : 0, y : 0 }, tspans, { x : 0, y : 0, width : 1, height : 1 });
      assert.equal(text.name, 'text');
      assert.equal(text.getPoints().length, 4);
      assert.equal(text.getExtent(), Math.sqrt(2));
      assert.equal(text.children, tspans);
    });

    it('should represent tspans', function () {
      var tspan = new Text.Span({ x : 0, y : 0 }, 'hello', { x : 0, y : 0, width : 1, height : 1 });
      assert.equal(tspan.name, 'tspan');
      assert.equal(tspan.getPoints().length, 4);
      assert.equal(tspan.getExtent(), Math.sqrt(2));
      assert.equal(tspan.text, 'hello');
    });
  });

  describe('transforming', function () {
    it('should not change with identity', function () {
      var text = new Text({ x : 0, y : 0, 'font-size' : 1 }, [], { x : 0, y : 0, width : 1, height : 1 });
      text = text.transform(Matrix.IDENTITY);
      assert.equal(text.attr.x, 0);
      assert.equal(text.attr.y, 0);
      assert.equal(text.attr['font-size'], 1);
    });

    it('should scale', function () {
      var text = new Text({ x : 0, y : 0, 'font-size' : 1 }, [], { x : 0, y : 0, width : 1, height : 1 });
      text = text.transform(Matrix.IDENTITY.scale(2));
      assert.equal(text.attr.x, 0);
      assert.equal(text.attr.y, 0);
      assert.equal(text.attr['font-size'], 2);
    });

    it('should translate', function () {
      var text = new Text({ x : 0, y : 0, 'font-size' : 1 }, [], { x : 0, y : 0, width : 1, height : 1 });
      text = text.transform(Matrix.IDENTITY.translate(1, 1));
      assert.equal(text.attr.x, 1);
      assert.equal(text.attr.y, 1);
      assert.equal(text.attr['font-size'], 1);
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockPaper(10, 10);

    it('should have expected properties', function () {
      var text = Shape.of(paper.text('a\nb').move(0, 0));
      assert.equal(text.name, 'text');
      assert.equal(text.attr.x, 0);
      assert.isNumber(text.attr.y); // Position is actually computed by svg.js
      assert.equal(text.children.length, 2);
      assert.equal(text.children[0].text, 'a');
      assert.equal(text.children[1].text, 'b');
    });

    it('should handle a raw text node with text content', function () {
      var node = paper.plain('a').move(0, 0).node;
      var text = Shape.of(node);
      assert.equal(text.name, 'text');
      assert.equal(text.text, 'a');
    });

    it('should handle a raw text node with tspans', function () {
      var node = paper.text('a\nb').move(0, 0).node;
      var text = Shape.of(node);
      assert.equal(text.name, 'text');
      assert.equal(text.children.length, 2);
    });

    it ('should extract pixel font-size from element style', function () {
      var e = paper.plain('a').move(0, 0);
      e.node.style['font-size'] = '10px';
      var text = Shape.of(e);
      assert.equal(text.attr['font-size'], 10);
    });

    it ('should not extract point font-size from element style', function () {
      var e = paper.plain('a').move(0, 0);
      e.node.style['font-size'] = '10pt';
      var text = Shape.of(e);
      assert.isUndefined(text.attr['font-size']);
    });
  });
});
