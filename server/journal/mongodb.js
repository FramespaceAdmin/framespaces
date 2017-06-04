var _ = require('lodash'),
    _async = require('async'),
    _events = require('../../lib/events'),
    _crypto = require('crypto'),
    config = require('config'),
    log = require('../../lib/log'),
    pass = require('pass-error'),
    Journal = require('../journal');

/**
 * MongoDB Journal driver.
 * NOTE use of 1.4.x client only, due to testing dependencies.
 * @param {String} id namepsace for stored journal data
 */
function MongoDbJournal(id) {
  if (!(this instanceof MongoDbJournal)) {
    return new MongoDbJournal(id);
  }
  Journal.call(this, id);
}

MongoDbJournal.client = function (cb/*(err, db)*/) {
  return require('mongodb').MongoClient.connect(process.env.FS_MONGO_URL, cb);
};

MongoDbJournal.connected = function connected(member) {
  return function () {
    var args = _.toArray(arguments), cb = _.last(args);
    if (MongoDbJournal.db) {
      member.apply(this, args);
    } else {
      log.debug('Connecting to MongoDB');
      MongoDbJournal.client(pass(function (db) {
        MongoDbJournal.db = db;
        MongoDbJournal.journals = db.collection('journals');
        MongoDbJournal.snapshots = db.collection('snapshots');
        MongoDbJournal.events = db.collection('events');
        member.apply(this, args);
      }, cb, null, this));
    }
  }
};

MongoDbJournal.close = function (cb) {
  if (MongoDbJournal.db) {
    MongoDbJournal.db.close(cb);
    delete MongoDbJournal.db;
    delete MongoDbJournal.journals;
    delete MongoDbJournal.snapshots;
    delete MongoDbJournal.events;
  }
}

MongoDbJournal.prototype = Object.create(Journal.prototype);
MongoDbJournal.prototype.constructor = MongoDbJournal;

MongoDbJournal.prototype.fetchDetails = MongoDbJournal.connected(function (cb/*(err, details)*/) {
  log.debug('Fetching details for', this.id);
  return MongoDbJournal.journals.findOne({ _id : this.id }, pass(function (details) {
    log.debug('Fetched details', details);
    cb(false, details);
  }, cb));
});

MongoDbJournal.prototype.lastValidSnapshot = function (fields, cb/*(err, snapshot, lastEventSeq)*/) {
  // Get the last snapshot for which an event exists
  var ssCursor = MongoDbJournal.snapshots.find(
    { fs : this.id },
    { fields : _.set(fields, 'lastEventId', 1) } // Require this field for finding the event
    ).sort({ timestamp : -1 });

  _async.doUntil(function (cb) {
    return ssCursor.nextObject(pass(function (snapshot) {
      return snapshot ? MongoDbJournal.events.findOne({
        _id : snapshot.lastEventId
      }, { fields : { seq : 1 } }, pass(function (lastEvent) {
        return cb(false, snapshot, lastEvent ? lastEvent.seq : -1);
      }, cb)) : cb(false, null, -1); // No more snapshots, return events from beginning
    }, cb));
  }, function (snapshot, lastEventSeq) {
    return !snapshot || lastEventSeq > -1;
  }, cb);
};

MongoDbJournal.prototype.fetchEvents = MongoDbJournal.connected(function (cb/*(err, snapshot, [event])*/) {
  this.lastValidSnapshot({ lastEventId : 1, state : 1, timestamp : 1 }, pass(function (snapshot, lastEventSeq) {
    return MongoDbJournal.events.find({
      fs : this.id, seq : { $gt : lastEventSeq }
    }).sort({ seq : 1 }).toArray(pass(function (events) {
      cb(false, snapshot, events);
    }, cb));
  }, cb, null, this));
});

MongoDbJournal.prototype.putDetails = MongoDbJournal.connected(function (details, cb/*(err)*/) {
  return MongoDbJournal.journals.insert(_.assign(details, {
    _id : this.id,
    nextSeq : 0
  }), pass(function (result) {
    return cb(false, details);
  }, cb));
});

MongoDbJournal.prototype.nextEventSeq = MongoDbJournal.connected(function (inc, cb/*(err, nextSeq)*/) {
  MongoDbJournal.journals.findAndModify(
    { _id : this.id }, // Query
    [], // Sort
    { $inc : { nextSeq : inc } }, // Doc (to be updated)
    { fields : { nextSeq : true } }, // Options
    pass(function (result) {
      cb(false, (result.value || result).nextSeq);
    }, cb, null, this));
});

MongoDbJournal.prototype.addEvent = MongoDbJournal.connected(function (data, timestamp, cb/*(err)*/) {
  // Atomically get a block of sequence numbers from the database
  var events = _events.from(data, timestamp);
  this.nextEventSeq(events.length, pass(function (nextSeq) {
    MongoDbJournal.events.insert(_.map(events, _.bind(function (event) {
      return _.assign(event, {
        _id : event.id,
        seq : nextSeq++,
        fs : this.id
      });
    }, this)), cb);
  }, cb, null, this));
});

MongoDbJournal.prototype.nonce = function (timestamp) {
  var hmac = _crypto.createHmac('sha256', process.env.FS_SECRET);
  hmac.update('' + timestamp);
  return hmac.digest('base64');
};

MongoDbJournal.prototype.offerSnapshot = MongoDbJournal.connected(function (timestamp, cb/*(err, nonce)*/) {
  // Basic policy: accept anything with a timestamp that we don't already have
  // TODO: Root out snapshots for which the last event never arrives
  MongoDbJournal.snapshots.findOne({ fs : this.id, timestamp : timestamp }, { fields : {
    lastEventId : 1, _id : 1
  } }, pass(function (existing) {
    // Shortcut if we already have a snapshot at this timestamp
    return existing ? cb(false) : this.lastValidSnapshot({ timestamp : 1 }, pass(function (snapshot) {
      return MongoDbJournal.events.count({
        timestamp : { $gt : _.get(snapshot, 'timestamp', 0) }
      }, pass(function (count) {
        return cb(false, count >= config.get('snapshotFrequency') ? this.nonce(timestamp) : undefined);
      }, cb, null, this));
    }, cb, null, this));
  }, cb, null, this));
});

MongoDbJournal.prototype.addSnapshot = MongoDbJournal.connected(function (nonce, snapshot, cb/*(err)*/) {
  if (nonce !== this.nonce(snapshot.timestamp)) {
    _async.setImmediate(cb, 'Bad nonce');
  } else {
    MongoDbJournal.snapshots.insert(_.set(snapshot, 'fs', this.id), cb);
  }
});

module.exports = MongoDbJournal;
