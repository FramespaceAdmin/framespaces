var _ = require('lodash'),
    Action = require('./action'),
    Io = require('./io'),
    Journal = require('./journal'),
    LocalUser = require('./user/local'),
    RemoteUser = require('./user/remote'),
    InteractionBuffer = require('./user/interactionBuffer'),
    Batch = require('./action/batch'),
    log = require('../lib/log'),
    pass = require('pass-error');

/**
 * Applies the Framespace actions into the given subject, and wires up IO to handle concurrent
 * actions and interactions from the local and remote users.
 * @param subject the thing to populate and interact with (probably a picture).
 *        Must have a changed(objects) member.
 * @param connected a callback function called when all is ready for user interactions,
 *        passing the local user and a function to commit an action.
 * @param ioOptions options passed to IO constructor (for unit testing)
 * @param events initial data passed to Journal constructor (for unit testing)
 */
exports.load = function (name, subject, connected/*(localUser, commit)*/, ioOptions, events) {
  var localActions = new Batch([]),
      users = {},
      io = new Io(name, ioOptions),
      journal = new Journal(name, events);
  io.subscribe('user.connected', function (userId, data) {
    var user; // NOTE this is the Framespace user, not the IO user
    if (userId === io.user.id) {
      user = new LocalUser(data, subject);
      var interactions = new InteractionBuffer(io);
      user.on('interacting', function (delta, state) {
        interactions.push(state);
      });
      // Pause the action while we request all previous actions
      io.pause('action', pass(function (play) {
        journal.fetchEvents(pass(function (events) {
          log.info('Replaying ' + events.length + ' actions in Framespace');
          // Recover the paused actions by resuming with play()
          events = _.uniqWith(_.concat(events, _.map(play(), 1)), function (a1, a2) {
            // This uniqueness check is in case actions seen on the channel have also been loaded.
            // NOTE that undo actions have the same id as their do action.
            return a1.id === a2.id && !a1.isUndo === !a2.isUndo; // NOT ensures boolean
          });
          // Perform all the actions
          subject.changed(new Batch(_.map(events, Action.fromJSON)).do(subject));
          // We're done. Return control to the caller with the user and commit function
          connected(user, function commit(action) {
            interactions.flush();
            // This will be echoed to the subscriber
            io.publish('action', action.toJSON(), pass(_.noop, io.close, null, io));
            // Local actions are applied pre-emptively and so may be out of order, see below
            localActions = localActions.and(action);
          });
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
  io.subscribe('action', function (userId, event) {
    journal.addEvent(event, pass(function () {
      var action = Action.fromJSON(event), objects;
      // Do not repeat actions that this user has already done
      if (!localActions.removeHead(action)) {
        // Undo any out of order local actions
        objects = localActions.un().do(subject);
        localActions = new Batch([]);
        // Commit the action
        subject.changed(_.concat(objects, action.isOK(subject) && action.do(subject)));
      }
    }, io.close, null, io));
  });
};
