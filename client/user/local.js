var _ = require('lodash'),
    format = require('util').format,
    browser = require('../browser'),
    BrowserUser = require('./browser'),
    html = require('html.js'),
    request = require('request'),
    log = require('../../lib/log'),
    pass = require('pass-error');

function LocalUser(data) {
  BrowserUser.call(this, data);
}

LocalUser.buttons = ['share'];

LocalUser.prototype = Object.create(BrowserUser.prototype);
LocalUser.prototype.constructor = LocalUser;

LocalUser.prototype.use = function (tool) {
  _.invoke(this.tool, 'deactivate');
  BrowserUser.prototype.use.call(this, tool);
  _.invoke(this.tool, 'activate');
  html.query('.paper').style.cursor = format('url(/web/%s.svg) %d %d, auto',
    this.tool.constructor.name.toLowerCase(), this.tool.offset.x, this.tool.offset.y);
};

LocalUser.prototype.show = function () {
  var login = _.bind(this.login, this);
  if (this.email) {
    // Confirm the user's email address
    browser.dialog.confirm({
      message : format('You are %s.', this.email),
      callback : function (ok) {
        ok || login();
      }
    });
  } else {
    // Invite the user to log in
    login();
  }
};

LocalUser.prototype.login = function () {
  browser.dialog.prompt({
    unsafeMessage : ['please enter your email so we can send you a link to log in.',
                     '(we won\'t do anything else with it.)'].join('<br>'),
    placeholder : this.email || 'yourname@example.org',
    callback : function (email) {
      email && request.post({
        url : browser.url(browser.url.pathname, 'login'),
        json : { email : email }
      }, function (err, res, body) {
        if (!err && res.statusCode === 202/* - Accepted*/) {
          browser.dialog.alert('thanks. please check your email!');
        } else {
          browser.dialog.alert('huh. something went wrong. sorry');
          log.error(err || body);
        }
      });
    }
  });
};

LocalUser.prototype.share = function () {
  // Share the framespace
};

module.exports = LocalUser;
