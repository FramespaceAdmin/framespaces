var _ = require('lodash'),
    assert = require('chai').assert,
    Picture = require('../client/picture'),
    Shape = require('../client/shape'),
    Line = require('../client/shape/line'),
    Polyline = require('../client/shape/polyline'),
    Point = require('kld-affine').Point2D,
    labelify = require('../client/suggest/labelify'),
    MockPaper = require('./mockPaper'),
    guid = require('../lib/guid');

describe('Labelify suggestor', function () {
  var paper = MockPaper(100, 100), picture = new Picture(paper);

  it('should labelify a text and a rect', function () {
    var rect = paper.rect(100, 100).move(0, 0).attr('id', guid());
    var text = paper.plain('a').move(2, 2).attr('id', guid());
    var action = labelify(picture, { results : [text] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var labelified = Shape.of(action.do(picture));
    assert.instanceOf(labelified, Label);
    assert.equal(labelified.attr.on, rect.attr('id'));
  });

  it('should labelify a rect and a text', function () {
    var rect = paper.rect(100, 100).move(0, 0).attr('id', guid());
    var text = paper.plain('a').move(2, 2).attr('id', guid());
    var action = labelify(picture, { results : [rect] });
    assert.isOk(action);
    assert.isAtLeast(action.confidence, 0.9);
    var labelified = Shape.of(action.do(picture));
    assert.instanceOf(labelified, Label);
    assert.equal(labelified.attr.on, rect.attr('id'));
  });
});
