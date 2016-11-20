var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Vector = require('kld-affine').Vector2D,
    Shape = require('../shape'),
    Removal = require('../action/removal'),
    Replacement = require('../action/replacement'),
    Addition = require('../action/addition'),
    Batch = require('../action/batch'),
    Tool = require('../tool');

var MIN_CURSOR_RADIUS = 8;

function Eraser(picture) {
  Tool.call(this, picture);

  var erased = { /* id : [fragment] */ };

  function erase(e, cursor, removeOld) {
    var shape = Shape.of(e);
    if (cursor.intersect(shape).length || _.every(shape.points, _.bind(cursor.contains, cursor))) {
      var fragmentShapes = _.invoke(Shape.of(e), 'minus', cursor);
      if (fragmentShapes) {
        removeOld ? removeOld() : e.remove();
        return _.map(fragmentShapes, _.method('addTo', picture.paper));
      }
    }
  }

  this.using = function using(delta, state) {
    if (state.active) { // Erasing
      // Cursor radius is dependent on how fast we are moving
      var cursor = Tool.cursor(state, Math.max(MIN_CURSOR_RADIUS, new Vector(delta.x || 0, delta.y || 0).length()));
      // Affect picture elements and previous fragments
      _.assign(erased, _.reduce(picture.allElements(), function (erased, e) {
        var fragments = erase(e, cursor, _.bind(e.attr, e, 'display', 'none'));
        return fragments ? _.set(erased, e.attr('id'), fragments) : erased;
      }, {}), _.reduce(erased, function (erased, fragments, id) {
        return _.set(erased, id, _.flatten(_.map(fragments, function (e) {
          return erase(e, cursor) || e;
        })));
      }, {}));
    } else if (delta.active) { // Finished erasing
      // Emit the rolled-up replacements and removals
      var actions = _.map(erased, function (fragments, id) {
        // CAUTION: rolling back temporary changes via side-effects
        var element = picture.getElement(id), fragmentShapes = _.map(fragments, function (fragment) {
          var fragmentShape = Shape.of(fragment);
          fragment.remove(); // Remove from the paper
          return fragmentShape;
        });
        element.attr('display', ''); // Makes visible

        var shape = Shape.of(element);
        if (_.isEmpty(fragmentShapes)) {
          return new Removal(shape).andCollateral(picture);
        } else {
          return _.reduce(_.tail(fragmentShapes), function (action, fragmentShape) {
            return action.and(new Addition(fragmentShape));
          }, new Replacement(shape, _.first(fragmentShapes).clone({ id : id })));
        }
      });

      if (!_.isEmpty(actions)) {
        this.emit('finished', new Batch(actions));
      }
      // Reset
      erased = {};
    }
  };
}

Eraser.prototype = Object.create(Tool.prototype);
Eraser.prototype.constructor = Eraser;

Eraser.prototype.offset = new Point(8, 32); // Roughly the bottom tip of the icon

module.exports = Eraser;
