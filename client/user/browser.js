var _ = require('lodash'),
    _url = require('url'),
    html = require('html.js'),
    User = require('../user');

function BrowserUser(json) {
  User.call(this, json);

  this.place = html.query('#users').add(html.query('#user-template').cloneNode(true));
  this.place.id = this.id;
  this.place.style.display = 'block'; // Because template is hidden

  this.avatar = this.place.add('img');
  this.avatar.src = _url.format({
    protocol : 'http',
    host : 'robohash.org',
    pathname : this.id,
    query : { size : '80x80', set : 'set3' }
  });
  _.assign(this.avatar.style, { display : 'block', position : 'absolute', left : 0, top : 0 });
};

BrowserUser.prototype = Object.create(User.prototype);
BrowserUser.prototype.constructor = BrowserUser;

BrowserUser.prototype.removed = function () {
  this.place.remove();
};

module.exports = BrowserUser;
