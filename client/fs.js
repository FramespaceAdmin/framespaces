var _ = require('lodash'),
    Action = require('./action'),
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
 *        Must have changed(objects), getState() and setState(state) members.
 * @param connected a callback function called when all is ready for user interactions,
 *        passing the local user and a function to commit an action.
 * @param ioOptions options passed to IO constructor (for unit testing)
 * @param events initial data passed to Journal constructor (for unit testing)
 */
exports.load = function (subject, io, journal, connected/*(localUser, commit)*/) {
  var localActions = new Batch([]), users = {};
  var noopOrDie = pass(_.noop, io.close, null, io);
  io.subscribe('user.connected', function (userId, timestamp, data) {
    var user; // NOTE this is the Framespace user, not the IO user
    if (userId === io.user.id) {
      user = new LocalUser(data, subject);
      var interactions = new InteractionBuffer(io);
      user.on('interacting', function (delta, state) {
        interactions.push(state);
      });

      journal.fetchEvents(pass(function (snapshot, events) {
        log.info('Replaying ' + events.length + ' actions in Framespace');
        /**
         * Recover the paused actions by resuming with playStartupEvents().
         * Async loading possibilities:
         * - subscribed events pre-date the loaded events (with a gap)
         * - subscribed events overlap the loaded events
         * - subscribed events post-date the loaded events (with a gap)
         * Resolved by filtering subscribed events:
         * - to after or equal to the last loaded event and snapshot timestamp
         * - to be distinct by id with the loaded events
         * This leaves the tiny possibility that we duplicate the last millisecond of events
         * leading to a snapshot. This should be covered by action idempotency.
         */
        subject.setState(_.get(snapshot, 'state'));
        playStartupEvents(function (userId, timestamp, data) {
          if (timestamp >= _.get(_.last(events) || snapshot, 'timestamp', 0) && !_.find(events, { id : data.id })) {
            events.push(data);
          }
        });
        // Map the events to Actions and perform them on the subject
        subject.changed(new Batch(_.map(events, Action.fromJSON)).do(subject));
        // We're done. Return control to the caller with the user and commit function
        connected(user, function commit(action) {
          interactions.flush();
          // This will be echoed to the subscriber
          io.publish('action', action.toJSON(), noopOrDie);
          // Local actions are applied pre-emptively and so may be out of order, see below
          localActions = localActions.and(action);
        });
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
  io.subscribe('interactions', function (userId, timestamp, interactions) {
    _.invoke(users, [userId, 'interact'], interactions);
  });
  io.subscribe('action', function (userId, timestamp, event) {
    // Store the event and maybe take a snapshot
    journal.addEvent(subject, event, timestamp, noopOrDie);
    var action = Action.fromJSON(event), objects;
    // Do not repeat actions that this user has already done
    if (!localActions.removeHead(action)) {
      // Undo any out of order local actions
      objects = localActions.un().do(subject);
      localActions = new Batch([]);
      // Commit the action
      subject.changed(_.concat(objects, action.isOK(subject) && action.do(subject)));
    }
  });
  // Pause the action until fully connected
  var playStartupEvents = io.pause('action');
};
