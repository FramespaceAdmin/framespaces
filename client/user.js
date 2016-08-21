var _ = require('lodash'),
    _url = require('url'),
    EventEmitter = require('events'),
    Point = require('kld-affine').Point2D,
    Snap = require('snapsvg'),
    html = require('html.js');

module.exports = function User(paper, json) {
  var events = new EventEmitter();

  _.assign(this, json);

  // See ../schema/state.json
  var state = { active : false };

  var place = html.query('#users').add(html.query('#user-template').cloneNode(true));
  place.id = this.id;
  place.style.display = 'block'; // Because template is hidden

  var avatar = place.add('img');
  avatar.src = _url.format({
    protocol : 'http',
    host : 'robohash.org',
    pathname : this.id,
    query : { size : '80x80', set : 'set3' }
  });
  avatar.style.display = 'block';

  var cursor = place.add('img');
  cursor.style.position = 'fixed';

  var tool;
  function use(newTool) {
    tool = newTool;
  }
  function isUsing(toolName) {
    return _.get(tool, 'constructor.name') === toolName;
  }
  events.on('interacting', function (delta, state) {
    return tool && tool.using(delta, state);
  });

  function showInteraction(delta, state) {
    var x = 0, y = 0;
    if (!delta || delta.active) {
      avatar.style.position = state.active ? 'fixed' : 'absolute';
      cursor.style.display = state.active && tool ? 'block' : 'none';
      cursor.src = tool ? '/web/' + tool.constructor.name.toLowerCase() + '.svg' : '';
    }
    if (state.active) {
      var svgToScr = Snap.matrix(paper.node.getScreenCTM());
      x = svgToScr.x(state.x, state.y);
      y = svgToScr.y(state.x, state.y);
    }
    _.assign(avatar.style, { left : x, top : y });
    var cursorOffset = _.get(tool, 'offset') || { x : 0, y : 0 };
    _.assign(cursor.style, { left : x - cursorOffset.x, top : y - cursorOffset.y });
  }
  showInteraction(null, state);

  function interacting(newState) {
    if ((state.active || newState.active) && tool) {
      var delta = _.transform(newState, function (delta, value, key) {
        if (key === 'char' || key === 'element') {
          delta[key] = value;
        } else if (value !== state[key]) {
          delta[key] = value - state[key];
        }
      });
      state = _.defaults(newState, {
        time : new Date().getTime(), // Timestamp
        tool : tool.constructor.name // The active tool
      }, state); // Carry forward unchanged state

      events.emit('interacting', delta, state);
      return state;
    } else {
      return _.assign(state, newState);
    }
  }

  function removed() {
    place.remove();
  }

  this.on = _.bind(events.on, events);
  this.interacting = interacting;
  this.showInteraction = showInteraction;
  this.removed = removed;
  this.avatar = avatar;
  this.isUsing = isUsing;
  this.use = use;
};
