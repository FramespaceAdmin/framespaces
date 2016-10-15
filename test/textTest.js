var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Text = require('../client/shape/text'),
    MockPaper = require('./mockPaper');

describe('Text', function () {
  describe('with raw attributes', function () {
    it('should represent text', function () {
      var tspans = [new Text.Span({ x : 0, y : 0 }, 'hello', { x : 0, y : 0, width : 1, height : 1 })];
      var text = new Text({ x : 0, y : 0 }, tspans, { x : 0, y : 0, width : 1, height : 1 });
      assert.equal(text.name, 'text');
      assert.equal(text.points.length, 4);
      assert.equal(text.extent, Math.sqrt(2));
      assert.equal(text.children, tspans);
    });

    it('should represent tspans', function () {
      var tspan = new Text.Span({ x : 0, y : 0 }, 'hello', { x : 0, y : 0, width : 1, height : 1 });
      assert.equal(tspan.name, 'tspan');
      assert.equal(tspan.points.length, 4);
      assert.equal(tspan.extent, Math.sqrt(2));
      assert.equal(tspan.text, 'hello');
    });
  });

  describe('with a Snap.svg element', function () {
    var paper = MockPaper(10, 10);

    it('should have expected properties', function () {
      var text = Shape.fromElement(paper.text(0, 0, ['a', 'b']));
      assert.equal(text.name, 'text');
      assert.equal(text.attr.x, 0);
      assert.equal(text.attr.y, 0);
      assert.equal(text.children.length, 2);
      assert.equal(text.children[0].text, 'a');
      assert.equal(text.children[1].text, 'b');
    });

    it('should handle a raw text node with text content', function () {
      var node = paper.text(0, 0, 'a').node;
      var text = Shape.fromElement(node);
      assert.equal(text.name, 'text');
      assert.equal(text.text, 'a');
    });

    it('should handle a raw text node with tspans', function () {
      var node = paper.text(0, 0, ['a', 'b']).node;
      var text = Shape.fromElement(node);
      assert.equal(text.name, 'text');
      assert.equal(text.children.length, 2);
    });

    it ('should extract pixel font-size from element style', function () {
      var e = paper.text(0, 0, 'a');
      e.node.style['font-size'] = '10px';
      var text = Shape.fromElement(e);
      assert.equal(text.attr['font-size'], 10);
    });

    it ('should not extract point font-size from element style', function () {
      var e = paper.text(0, 0, 'a');
      e.node.style['font-size'] = '10pt';
      var text = Shape.fromElement(e);
      assert.isUndefined(text.attr['font-size']);
    });
  });
});
