var _ = require('lodash'),
    assert = require('chai').assert,
    Shape = require('../client/shape'),
    Rect = require('../client/shape/rect'),
    Text = require('../client/shape/text'),
    Label = require('../client/shape/label');

describe('Label', function () {
  it('should load directly from JSON', function () {
    var bbox = { x : 0, y : 0, width : 1, height : 1 };
    var tspans = [new Text.Span({ x : 0, y : 0 }, 'hello', bbox)];
    var label = Label.fromJSON({
      name : 'text', children : tspans, attr : { class : 'label' }, bbox : bbox
    });
    assert.instanceOf(label, Label);
    assert.equal(label.attr.x, 0);
    assert.equal(label.attr.y, 0);
  });

  it('should position itself in the middle of the labelled shape', function () {
    var label = new Label({ 'font-size' : 2 }, [], { x : 0, y : 0, width : 2, height : 2 });
    label = label.label(new Rect({ x : 0, y : 0, width : 4, height : 4, id : 'on' }));
    assert.equal(label.attr.x, 1);
    assert.equal(label.attr.y, 3); // Baseline
    assert.equal(label.attr.on, 'on');
  });
});
