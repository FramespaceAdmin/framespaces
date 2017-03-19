var _ = require('lodash'),
    assert = require('chai').assert,
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Polyline = require('../client/shape/polyline'),
    Point = require('kld-affine').Point2D,
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
    var rectified = Shape.of(action.do(picture));
    assert.instanceOf(rectified, Line);
    assert.equal(rectified.getExtent(), 1);
  });

  it('should not recurse', function () {
    var line = paper.line(0, 0, 1, 0.01).attr('id', guid());
    var action = rectify(picture, rectify(picture, line).do(picture));
    assert.isUndefined(action);
  });

  it('should rectify a polyline', function () {
    var pl = paper.polyline(0, 0, 1, 0.01, 1.01, 1).attr('id', guid());
    var action = rectify(picture, pl);
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var rectified = Shape.of(action.do(picture));
    assert.instanceOf(rectified, Polyline);
    assert.equal(rectified.getPoints().length, 3);
    assert.deepEqual(rectified.getPoints()[0], new Point(0, 0));
    assert.deepEqual(rectified.getPoints()[1], new Point(1, 0));
    assert.deepEqual(rectified.getPoints()[2], new Point(1, 1));
    assert.equal(rectified.getExtent(), Math.sqrt(2));
  });
});
