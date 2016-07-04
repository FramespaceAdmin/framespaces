var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Linkline = require('../client/shape/linkline'),
    MockSnap = require('./mockSnap');

describe('Linkline', function () {
  function assertMoves(linkline) {
    // Demonstrate that a linkline moves with offsets
    var move = linkline.mover();
    linkline = move.call(linkline, 1, 1);

    assert.equal(linkline.attr.ox, 1);
    assert.equal(linkline.attr.oy, 1);
  }

  it('should load directly from JSON', function () {
    var linkline = Linkline.fromJSON({
      name : 'line', attr : { x1 : 0, y1 : 0, x2 : 1, y2 : 1, class : 'link' }
    });
    assert.equal(linkline.name, 'line');
    assert.equal(linkline.points.length, 2);
    assertMoves(linkline);
  });

  it('should load from JSON via Shape', function () {
    var linkline = Shape.fromJSON({
      name : 'line', attr : { x1 : 0, y1 : 0, x2 : 1, y2 : 1, class : 'link' }
    });
    assert.equal(linkline.name, 'line');
    assert.equal(linkline.points.length, 2);
    assertMoves(linkline);
  });
});
