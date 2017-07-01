require('jsdom-global')();

var _ = require('lodash'),
    jsdom = require('jsdom'),
    assert = require('chai').assert;

describe('Browser wrapper', function () {
  var browser;

  before(function () {
    jsdom.changeURL(window, 'http://localhost:3001/fs');
    browser = require('../client/browser');
  });

  it('should construct derived urls', function () {
    assert.equal(browser.url('name'), 'http://localhost:3001/name');
    assert.equal(browser.url('n1', 'n2'), 'http://localhost:3001/n1/n2');
  });

  it('should report the pathname and root', function () {
    assert.equal(browser.url.pathname, '/fs');
    assert.equal(browser.url.rootname, 'fs');
  });
});
