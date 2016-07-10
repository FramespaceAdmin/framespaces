var _ = require('lodash'),
    assert = require('chai').assert,
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Polyline = require('../client/shape/polyline'),
    simplify = require('../client/suggest/simplify'),
    MockPaper = require('./mockPaper'),
    guid = require('../lib/guid');

describe('Simplify suggestor', function () {
  var paper = MockPaper(10, 10), picture = new Picture(paper);

  it('should simplify a straight line', function () {
    var pl = paper.polyline(0, 0, 1, 0, 2, 0).attr('id', guid());
    var action = simplify(picture, pl);
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(action());
    assert.instanceOf(simplified, Line);
    assert.equal(simplified.extent, 2);
  });

  it('should simplify two segments', function () {
    var pl = paper.polyline(0, 0, 1, 0, 2, 0, 2, 1, 2, 2).attr('id', guid());
    var action = simplify(picture, pl);
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var simplified = Shape.of(action());
    assert.instanceOf(simplified, Polyline);
    assert.equal(simplified.points.length, 3);
    assert.equal(simplified.extent, Math.sqrt(8));
  });
});
