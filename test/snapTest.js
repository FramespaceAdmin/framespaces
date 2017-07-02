var _ = require('lodash'),
    assert = require('chai').assert,
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Polyline = require('../client/shape/polyline'),
    Rect = require('../client/shape/rect'),
    snap = require('../client/suggest/snap'),
    MockPaper = require('./mockPaper'),
    guid = require('../lib/guid');

describe('Snap suggestor', function () {
  it('should snap two lines together', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var oldline = paper.line(0, 0, 0.99, 0).attr('id', guid());
    var line = paper.line(1, 0, 2, 0).attr('id', guid());
    var action = snap(picture, { results : [line] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var snapped = Shape.of(_.last(action.do(picture)));
    assert.instanceOf(snapped, Polyline);
    assert.equal(snapped.getExtent(), 2);
  });

  it('should snap a line and a polyline together', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var oldline = paper.line(0, 0, 0.99, 0).attr('id', guid());
    var polyline = paper.polyline([1, 0, 2, 0, 2, 1]).attr('id', guid());
    var action = snap(picture, { results : [polyline] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var snapped = Shape.of(_.last(action.do(picture)));
    assert.instanceOf(snapped, Polyline);
    assert.equal(snapped.getExtent(), Math.sqrt(5));
  });

  it('should snap a polyline closed', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var polyline = paper.polyline([0, 0, 1, 0, 1, 1, 0, 1, 0, 0.01]).attr('id', guid());
    var action = snap(picture, { results : [polyline] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var snapped = Shape.of(_.last(action.do(picture)));
    assert.instanceOf(snapped, Rect);
    assert.equal(snapped.getExtent(), Math.sqrt(2));
  });
});
