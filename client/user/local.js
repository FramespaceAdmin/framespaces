var _ = require('lodash'),
    format = require('util').format,
    BrowserUser = require('./browser'),
    html = require('html.js');

function LocalUser(data) {
  BrowserUser.call(this, data);
};

LocalUser.prototype = Object.create(BrowserUser.prototype);
LocalUser.prototype.constructor = LocalUser;

LocalUser.prototype.use = function (tool) {
  _.invoke(this.tool, 'deactivate');
  BrowserUser.prototype.use.call(this, tool);
  _.invoke(this.tool, 'activate');
  html.query('.paper').style.cursor = format('url(/web/%s.svg) %d %d, auto',
    this.tool.constructor.name.toLowerCase(), this.tool.offset.x, this.tool.offset.y);
};

module.exports = LocalUser;
