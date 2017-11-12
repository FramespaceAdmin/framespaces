var _ = require('lodash'),
    assert = require('chai').assert,
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Polyline = require('../client/shape/polyline'),
    Polygon = require('../client/shape/polygon'),
    simplify = require('../client/suggest/simplify'),
    MockPaper = require('./mockPaper'),
    guid = require('../lib/guid');

describe('Simplify suggestor', function () {
  var paper = MockPaper(10, 10), picture = new Picture(paper);

  it('should simplify a straight line', function () {
    var pl = paper.polyline([0, 0, 1, 0, 2, 0]).attr('id', guid());
    var action = simplify(picture, { results : [pl] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(_.last(action.do(picture)));
    assert.instanceOf(simplified, Line);
    assert.equal(simplified.getExtent(), 2);
  });

  it('should simplify two straight segments', function () {
    var pl = paper.polyline([0, 0, 1, 0, 2, 0, 2, 1, 2, 2]).attr('id', guid());
    var action = simplify(picture, { results : [pl] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(action.do(picture));
    assert.instanceOf(simplified, Polyline);
    assert.equal(simplified.getPoints().length, 3);
    assert.equal(simplified.getExtent(), Math.sqrt(8));
  });

  it('should simplify two wonky segments', function () {
    var pl = paper.polyline([0, 0, 1, 0, 2, 0.01, 2.01, 1, 2, 2]).attr('id', guid());
    var action = simplify(picture, { results : [pl] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(action.do(picture));
    assert.instanceOf(simplified, Polyline);
    assert.equal(simplified.getPoints().length, 3);
    assert.equal(simplified.getExtent(), Math.sqrt(8));
  });

  it('should simplify a triangle with redundant points', function () {
    var pl = paper.polygon([0, 0, 1, 0, 2, 0, 2, 1, 2, 2]).attr('id', guid());
    var action = simplify(picture, { results : [pl] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(action.do(picture));
    assert.instanceOf(simplified, Polygon);
    assert.equal(simplified.getPoints().length, 3);
    assert.equal(simplified.getExtent(), Math.sqrt(8));
  });

  it('should not simplify a simple triangle', function () {
    var pl = paper.polygon([0, 0, 2, 0, 2, 2]).attr('id', guid());
    var action = simplify(picture, { results : [pl] });
    assert.isNotOk(action);
  });

  it('should simplify a wonky triangle', function () {
    var pl = paper.polygon([0, 0, 1, 0, 2, 0.01, 2.01, 1, 2, 2]).attr('id', guid());
    var action = simplify(picture, { results : [pl] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(action.do(picture));
    assert.instanceOf(simplified, Polygon);
    assert.equal(simplified.getPoints().length, 3);
    assert.equal(simplified.getExtent(), Math.sqrt(8));
  });

  it('should simplify a triangle starting with a redundant point', function () {
    var pl = paper.polygon([1, 0, 2, 0, 2, 1, 2, 2, 0, 0]).attr('id', guid());
    var action = simplify(picture, { results : [pl] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(action.do(picture));
    assert.instanceOf(simplified, Polygon);
    assert.equal(simplified.getPoints().length, 3);
    assert.equal(simplified.getExtent(), Math.sqrt(8));
  });
});
