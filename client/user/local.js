var _ = require('lodash'),
    format = require('util').format,
    User = require('../user'),
    html = require('html.js');

function LocalUser(id) {
  User.call(this, { id : id });
};

LocalUser.prototype = Object.create(User.prototype);
LocalUser.prototype.constructor = LocalUser;

LocalUser.prototype.use = function (tool) {
  _.invoke(this.tool, 'deactivate');
  User.prototype.use.call(this, tool);
  _.invoke(this.tool, 'activate');
  html.query('.paper').style.cursor = format('url(/web/%s.svg) %d %d, auto',
    this.tool.constructor.name.toLowerCase(), this.tool.offset.x, this.tool.offset.y);
};

module.exports = LocalUser;
