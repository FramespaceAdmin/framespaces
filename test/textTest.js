var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Text = require('../client/shape/text'),
    MockSnap = require('./mockSnap');

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
});
