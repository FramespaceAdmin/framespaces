var _ = require('lodash'),
    BrowserUser = require('./browser'),
    tools = require('../tool'),
    html = require('html.js'),
    browser = require('../browser');

function RemoteUser(data, picture) {
  BrowserUser.call(this, data);

  this.picture = picture;

  this.cursor = this.place.add('img');
  this.cursor.style.position = 'fixed';

  this.interactions = []; // Queue of incoming interactions

  this.showInteraction(null, this.state);
};

RemoteUser.prototype = Object.create(BrowserUser.prototype);
RemoteUser.prototype.constructor = RemoteUser;

RemoteUser.prototype.showInteraction = function (delta, state) {
  var x = 0, y = 0;
  if (!delta || delta.active) {
    this.avatar.style.position = state.active ? 'fixed' : 'absolute';
    this.cursor.style.display = state.active && this.tool ? 'block' : 'none';
    this.cursor.src = this.tool ? '/web/' + this.tool.constructor.name.toLowerCase() + '.svg' : '';
  }
  if (state.active) {
    var svgToScr = browser.svg.matrix(html.query('.paper').getScreenCTM());
    x = svgToScr.x(state.x, state.y);
    y = svgToScr.y(state.x, state.y);
  }
  _.assign(this.avatar.style, { left : x, top : y });
  var cursorOffset = _.get(this.tool, 'offset') || { x : 0, y : 0 };
  _.assign(this.cursor.style, { left : x - cursorOffset.x, top : y - cursorOffset.y });
};

RemoteUser.prototype.interact = function (interactions) {
  var queued = this.interactions.length;
  this.interactions.push.apply(this.interactions, interactions);
  if (!queued) {
    this.nextInteraction();
  }
};

RemoteUser.prototype.nextInteraction = function () {
  var state = this.interactions.shift();
  if (!this.isUsing(state.tool)) {
    this.use(new tools[state.tool](this.picture));
  }
  this.interacting(state);
  if (this.interactions.length) {
    setTimeout(_.bind(this.nextInteraction, this), _.first(this.interactions).time - state.time);
  }
};

module.exports = RemoteUser;
