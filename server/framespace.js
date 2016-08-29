var _ = require('lodash'),
    _url = require('url'),
    log = require('../lib/log'),
    ajv = new (require('ajv'))({
      verbose : log.getLevel() <= log.levels.DEBUG,
      allErrors : log.getLevel() <= log.levels.DEBUG
    }),
    taffy = require('taffydb').taffy,
    guid = require('../lib/guid');

var validate = {
  action : ajv.compile(require('../schema/action')),
  state : ajv.compile(require('../schema/state'))
};

function Framespace(io, name) {
  var users = taffy(), actions = taffy();

  this.name = name;
  this.id = guid();

  io.of('/' + name + '/io').on('connection', function (socket) {
    log.debug(socket.id, 'Connected');

    var user = { id : _url.parse(socket.id).hash.slice(1) };
    // Tell the new socket about all existing users
    users().each(function (user) {
      socket.emit('user.connected', user);
    });
    users.insert(user);
    // Tell everyone else about the new user
    socket.broadcast.emit('user.connected', user);

    // Replay all the actions that have gone before
    actions().each(function (action) {
      socket.emit('action', null, action);
    });

    socket.on('action', function (action) {
      if (!validate.action(action)) {
        log.debug(validate.action.errors);
      } else {
        if (action.undo) {
          actions({ id : action.id }).remove();
        } else {
          actions.insert(action);
        }
        socket.broadcast.emit('action', user.id, action);
      }
    });

    socket.on('interactions', function (interactions) {
      if (interactions.length) {
        if (!_.every(interactions, validate.state)) {
          log.debug(validate.state.errors);
        } else {
          socket.broadcast.emit('interactions', user.id, interactions);
        }
      }
    });

    socket.on('disconnect', function () {
      users({ id : user.id }).remove();
      socket.broadcast.emit('user.disconnected', user.id);
    });
  });
}

module.exports = Framespace;
