var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Rect = require('../client/shape/rect'),
    Linkarc = require('../client/shape/linkarc'),
    dPattern = require('./arcTest').dPattern;

describe('Linkarc', function () {
  var linked = {
    from : new Rect({ x : 0, y : 0, width : 4, height : 4, id : 'from' }),
    to : new Rect({ x : 8, y : 0, width : 4, height : 4, id : 'to' })
  };

  it('should link two boxes by their edges', function () {
    // Line begin and end should change, but curve stay the same
    var linkarc = new Linkarc({ d : 'M1 1 A 8 8, 0, 0, 0, 2 2' }).link(linked.from, linked.to);

    assert.match(linkarc.attr.d, dPattern('M4 ~2.8 A 8 8, 0, 0, 0, 8 ~2.8'));
  });

  it('should move to traverse a given point', function () {
    var linkarc = new Linkarc({ d : 'M1 1 A 8 8, 0, 0, 0, 2 2' }).link(linked.from, linked.to);

    var move = linkarc.mover(true, new Rect({ x : 5, y : 1, width : 2, height : 2 }), _.propertyOf(linked));
    linkarc = move.call(linkarc, 0, -1, 6, 1);

    // Curve sweeps upward now
    assert.match(linkarc.attr.d, dPattern('M4 ~1.2 A ~8. ~8., 0, 0, 1 8 ~1.2'));
  });
});
