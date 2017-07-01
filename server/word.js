var _ = require('lodash'),
    pass = require('pass-error'),
    request = require('request');

exports.random = function randomWord(options, cb/*(err, word)*/) {
  request({
    url : 'http://api.wordnik.com/v4/words.json/randomWord',
    qs : _.assign({
      api_key : '160c6dc0f032dc73cf2050d557f0277d9ec86e1cf464ce240'
    }, options),
    json : true
  }, pass(function (res, body) {
    if (res.statusCode === 200) {
      var word = body.word.toLowerCase();
      // Only accept alphabet characters
      return /^[a-z]+$/.test(word) ? cb(false, word) : randomWord(options, cb);
    } else {
      return cb(body);
    }
  }, cb));
};
