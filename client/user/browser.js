var _ = require('lodash'),
    _url = require('url'),
    browser = require('../browser'),
    User = require('../user'),
    ANIMATE_DURATION = 300,
    BUTTON_WIDTH = 80;

function BrowserUser(json) {
  User.call(this, json);

  // Placeholder based on template
  this.place = browser.html.query('#user-template').cloneNode(true);
  this.place = browser.html.query('#users').add(this.place);
  this.place.id = this.id;
  this.place.style.display = 'block'; // Because template is hidden

  // Avatar, which is a floating image (appears to be bounded by the user-button)
  this.avatar = this.place.query('.user-icon');
  this.avatar.src = _url.format({
    protocol : 'http',
    host : 'robohash.org',
    pathname : this.id,
    query : { size : '80x80', set : 'set3' }
  });

  // Toolbar SVG containing main user button and additional buttons
  var toolbarSvg = browser.svg(this.place.query('.user-toolbar'));

  // User button and additional buttons
  var userButton = toolbarSvg.select('.user-button').mousedown(_.bind(this.show, this));
  var auxButtons = _.map(this.constructor.buttons, _.bind(function (name) {
    return toolbarSvg.select('.' + name + '-button').mousedown(_.bind(this[name], this));
  }, this));
  var toolbar = new BrowserUser.Toolbar(toolbarSvg, _.concat(userButton, auxButtons));
  userButton.mouseover(_.bind(toolbar.show, toolbar));
  toolbarSvg.node.onmouseleave = _.bind(toolbar.unshow, toolbar);
};

BrowserUser.prototype = Object.create(User.prototype);
BrowserUser.prototype.constructor = BrowserUser;

BrowserUser.prototype.removed = function () {
  this.place.remove();
};

/**
 * Called when the user button is clicked. Implement to show or ask for user identity.
 */
BrowserUser.prototype.show = function () {
  throw undefined;
};

BrowserUser.Toolbar = function (svg, buttons) {
  this.showing = false;
  this.svg = svg;
  this.buttons = buttons;
};

BrowserUser.Toolbar.prototype.stop = function () {
  _.each(_.concat(this.svg, this.buttons), _.method('stop'));
};

BrowserUser.Toolbar.prototype.show = function () {
  if (!this.showing) {
    this.stop();
    this.showing = true;
    this.svg.node.style['pointer-events'] = 'auto';
    this.svg.animate({ width : (this.buttons.length + 1) * BUTTON_WIDTH }, ANIMATE_DURATION);
    _.each(this.buttons, function (button, i) {
      button.node.style.visibility = 'visible';
      button.animate({ x : BUTTON_WIDTH * i }, ANIMATE_DURATION);
    });
  }
};

BrowserUser.Toolbar.prototype.unshow = function () {
  if (this.showing) {
    this.stop();
    this.showing = false;
    this.svg.node.style['pointer-events'] = 'none';
    this.svg.animate({ width : BUTTON_WIDTH }, ANIMATE_DURATION);
    _.each(this.buttons, function (button, i) {
      button.animate({ x : 0 }, ANIMATE_DURATION, function () {
        if (i > 0) button.node.style.visibility = 'hidden';
      });
    });
  }
};

module.exports = BrowserUser;
