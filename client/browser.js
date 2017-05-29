/**
 * Encapsulates the browser environment.
 * This should be the only place that references "window" or uses browser-only libraries.
 */
var _ = require('lodash'),
    _url = require('url'),
    join = require('url-join'),
    storageAvailable = require('storage-available');

Object.defineProperties(exports, {
  cookie : {
    value : require('js-cookie').get
  },
  url : {
    value : Object.defineProperties(function () {
      return join.apply(null, _.concat(_url.format({
        protocol : window.location.protocol,
        host : window.location.host
      }), arguments));
    }, {
      pathname : {
        get : function () {
          return window.location.pathname;
        }
      },
      rootname : {
        get : function () {
          return _.find(window.location.pathname && window.location.pathname.split('/'));
        }
      }
    })
  },
  goto : {
    value : function () {
      window.location = exports.url.apply(null, arguments);
    }
  },
  localStorage : {
    get : function () {
      return storageAvailable('localStorage') && window.localStorage;
    }
  },
  html : {
    get : function() {
      return require('html.js');
    }
  },
  svg : {
    get : function() {
      return require('snapsvg');
    }
  },
  hamster : {
    get : function() {
      return require('hamsterjs');
    }
  },
  domParser : {
    value : function() {
      return new DOMParser();
    }
  }
});
