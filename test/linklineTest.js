var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Rect = require('../client/shape/rect'),
    Line = require('../client/shape/line'),
    Linkline = require('../client/shape/linkline'),
    MockPaper = require('./mockPaper');

describe('Linkline', function () {
  it('should load directly from JSON', function () {
    var linkline = Linkline.fromJSON({
      name : 'line', attr : { x1 : 0, y1 : 0, x2 : 1, y2 : 1, class : 'link' }
    });
    assert.equal(linkline.name, 'line');
    assert.equal(linkline.points.length, 2);
  });

  it('should load from JSON via Shape', function () {
    var linkline = Shape.fromJSON({
      name : 'line', attr : { x1 : 0, y1 : 0, x2 : 1, y2 : 1, class : 'link' }
    });
    assert.equal(linkline.name, 'line');
    assert.equal(linkline.points.length, 2);
  });

  var linked = {
    from : new Rect({ x : 0, y : 0, width : 4, height : 4, id : 'from' }),
    to : new Rect({ x : 8, y : 0, width : 4, height : 4, id : 'to' })
  };

  it('should work out its ends from given angles', function () {
    // Prototype line begin and end are ignored
    var linkline = new Linkline({ a1 : 0, a2 : 0 }).link(linked.from, linked.to);

    assert.equal(linkline.attr.x1, 4);
    assert.equal(linkline.attr.y1, 2);
    assert.equal(linkline.attr.x2, 8);
    assert.equal(linkline.attr.y2, 2);
  });

  it('should move its "from" end', function () {
    var linkline = new Linkline({ a1 : 0, a2 : 0 }).link(linked.from, linked.to);

    var move = linkline.mover(true, new Rect({ x : 3, y : 1, width : 2, height : 2 }), _.propertyOf(linked));
    linkline = move.call(linkline, 0, -1, 4, 1);

    assert.equal(linkline.attr.a1, -Math.atan(1/2));
    assert.equal(linkline.attr.a2, 0);
  });

  it('should move its "to" end', function () {
    var linkline = new Linkline({ a1 : 0, a2 : 0 }).link(linked.from, linked.to);

    var move = linkline.mover(true, new Rect({ x : 7, y : 1, width : 2, height : 2 }), _.propertyOf(linked));
    linkline = move.call(linkline, 0, -1, 8, 1);

    assert.equal(linkline.attr.a1, 0);
    assert.equal(linkline.attr.a2, Math.atan(1/2));
  });

  it('should move both ends when moved by the middle', function () {
    var linkline = new Linkline({ a1 : 0, a2 : 0 }).link(linked.from, linked.to);

    var move = linkline.mover(true, new Rect({ x : 5, y : 1, width : 2, height : 2 }), _.propertyOf(linked));
    linkline = move.call(linkline, 0, -1, 6, 1);

    assert.equal(linkline.attr.a1, -Math.atan(1/2));
    assert.equal(linkline.attr.a2, Math.atan(1/2));
  });

  it('should move both ends when moved by the middle twice', function () {
    var linkline = new Linkline({ a1 : 0, a2 : 0 }).link(linked.from, linked.to);

    var move = linkline.mover(true, new Rect({ x : 5, y : 1, width : 2, height : 2 }), _.propertyOf(linked));
    linkline = move.call(linkline, 0, -1, 6, 1);
    linkline = move.call(linkline, 0, -1, 6, 0);

    assert.closeTo(linkline.attr.a1, -Math.atan(1), 1e-15);
    assert.closeTo(linkline.attr.a2, Math.atan(1), 1e-15);
  });
});
