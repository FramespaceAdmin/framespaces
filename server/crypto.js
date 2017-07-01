var _ = require('lodash'),
    _async = require('async'),
    _crypto = require('crypto'),
    _jwt = require('jsonwebtoken');

exports.verify = function (jwt, cb/*(err, data)*/) {
  return _jwt.verify(jwt, process.env.FS_SECRET, cb);
};

exports.sign = function (data, cb/*(err, jwt)*/) {
  return _jwt.sign(data, process.env.FS_SECRET, {}, cb);
};

exports.encrypt = _async.asyncify(function (data) {
  var cipher = _crypto.createCipher('aes192', process.env.FS_SECRET),
      hex = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  hex += cipher.final('hex');
  return hex;
});

exports.decrypt = _async.asyncify(function (hex) {
  var decipher = _crypto.createDecipher('aes192', process.env.FS_SECRET),
      decrypted = decipher.update(hex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
});