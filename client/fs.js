var _ = require('lodash'),
    config = require('config'),
    Action = require('./action'),
    LocalUser = require('./user/local'),
    RemoteUser = require('./user/remote'),
    Batch = require('./action/batch'),
    log = require('../lib/log'),
    pass = require('pass-error');

// NOTE non-local IO is aliasified, see modules.js
var Io = config.get('modules.io') === 'local' ? require('./io/local') : require('io');

/**
 * Applies the Framespace actions into the given subject, and wires up IO to handle concurrent
 * actions and interactions from the local and remote users.
 * @param subject the thing to populate and interact with (probably a picture).
 *        Must have a changed(objects) member.
 * @param connected a callback function called when all is ready for user interactions,
 *        passing the local user and a function to commit an action.
 * @param ioOptions options passed to IO constructor
 */
exports.load = function (subject, connected/*(localUser, commit)*/, ioOptions) {
  var localActions = new Batch([]), users = {}, io = new Io(ioOptions);
  io.subscribe('user.connected', function (userId, data) {
    var user; // NOTE this is the Framespace user, not the IO user
    if (userId === io.user.id) {
      user = new LocalUser(data, subject);
      var interactions = [];
      // Send interactions in batches
      function flushInteractions() {
        if (interactions.length) {
          io.publish('interactions', interactions.splice(0, interactions.length));
        }
      }
      user.on('interacting', function (delta, state) {
        if (!interactions.length) {
          setTimeout(flushInteractions, 100);
        }
        interactions.push(state);
      });
      function commit(action) {
        flushInteractions();
        // This will be echoed to the subscriber
        io.publish('action', action.toJSON(), pass(_.noop, io.close, null, io));
        // Local actions are applied pre-emptively and so may be out of order, see below
        localActions = localActions.and(action);
      }
      // Pause the action while we request all previous actions
      io.pause('action', pass(function (play) {
        io.get('actions', pass(function (actions) {
          log.info('Replaying ' + actions.length + ' actions in Framespace');
          // Recover the paused actions by resuming with play()
          actions = _.uniqWith(_.concat(actions, _.map(play(), 1)), function (a1, a2) {
            // This uniqueness check is in case actions seen on the channel have also been loaded.
            // NOTE that undo actions have the same id as their do action.
            return a1.id === a2.id && !a1.isUndo === !a2.isUndo; // NOT ensures boolean
          });
          // Perform all the actions
          subject.changed(new Batch(_.map(actions, Action.fromJSON)).do(subject));
          // We're done. Return control to the caller with the user and commit function
          connected(user, commit);
        }, io.close, null, io));
      }, io.close, null, io));
    } else {
      user = new RemoteUser(data, subject);
      user.on('interacting', function (delta, state) {
        user.showInteraction(delta, state);
      });
    }
    users[userId] = user;
  });
  io.subscribe('user.disconnected', function (userId) {
    _.invoke(users, [userId, 'removed']);
    delete users[userId];
  });
  io.subscribe('interactions', function (userId, interactions) {
    _.invoke(users, [userId, 'interact'], interactions);
  });
  io.subscribe('action', function (userId, data) {
    var action = Action.fromJSON(data), objects;
    // Do not repeat actions that this user has already done
    if (!localActions.removeHead(action)) {
      // Undo any out of order local actions
      objects = localActions.un().do(subject);
      localActions = new Batch([]);
      // Commit the action
      subject.changed(_.concat(objects, action.isOK(subject) && action.do(subject)));
    }
  });
};
