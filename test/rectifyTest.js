var _ = require('lodash'),
    assert = require('chai').assert,
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Polyline = require('../client/shape/polyline'),
    rectify = require('../client/suggest/rectify'),
    MockPaper = require('./mockPaper'),
    guid = require('../lib/guid');

describe('Rectify suggestor', function () {
  var paper = MockPaper(10, 10), picture = new Picture(paper);

  it('should rectify a straight line', function () {
    var line = paper.line(0, 0, 1, 0.01).attr('id', guid());
    var action = rectify(picture, line);
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var rectified = Shape.of(action());
    assert.instanceOf(rectified, Line);
    assert.equal(rectified.extent, 1);
  });

  it('should not recurse', function () {
    var line = paper.line(0, 0, 1, 0.01).attr('id', guid());
    var action = rectify(picture, rectify(picture, line)());
    assert.isUndefined(action);
  });

  it('should rectify a polyline', function () {
    var pl = paper.polyline(0, 0, 1, 0.01, 1.01, 1).attr('id', guid());
    var action = rectify(picture, pl);
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var rectified = Shape.of(action());
    assert.instanceOf(rectified, Polyline);
    assert.isTrue(rectified.hasClass('rect'));
    assert.equal(rectified.points.length, 3);
    assert.equal(rectified.extent, Math.sqrt(2));
  });
});
