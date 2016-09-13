var _ = require('lodash'),
    _url = require('url'),
    log = require('../lib/log'),
    fsUrl = require('./fsUrl'),
    Snap = require('snapsvg'),
    Picture = require('./picture'),
    History = require('./history'),
    Toolbar = require('./toolbar'),
    Suggestor = require('./suggest'),
    LocalUser = require('./user/local'),
    RemoteUser = require('./user/remote'),
    keycode = require('keycode'),
    Io = require('io'), // NOTE this is aliasified, see /modules.js
    jwtDecode = require('jwt-decode'),
    cookies = require('js-cookie'),
    request = require('xhr'),
    pass = require('pass-error'),
    guid = require('../lib/guid'),
    paper = Snap('.paper'),
    picture = new Picture(paper),
    history = new History(picture),
    tools = require('./tool');

function makeTool(constructor) {
  var tool = new constructor(picture);
  tool.on('finished', function (action) {
    action.description = tool.constructor.name;
    action.isUser = true;
    history.step(action);
  });
  return tool;
}

var pen = makeTool(tools.Pen),
    hand = makeTool(tools.Hand),
    eraser = makeTool(tools.Eraser);

var toolbar = new Toolbar(Snap('#toolbar'));
toolbar.undoButton.mousedown(history.undo);
toolbar.redoButton.mousedown(history.next);
history.on('revised', toolbar.updatePreviews);

function errorPage(err) {
  window.location = fsUrl.append('error?cause=' + encodeURIComponent(err));
}

// Add the current user and wire up events
var jwt = cookies.get('jwt') || errorPage('Can\'t log in');
var io = new Io(jwt, pass(function connected() {
  var user = new LocalUser(jwtDecode(jwt).id);
  // Send interactions in batches
  var interactions = [];
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
  window.onblur = function () {
    user.interacting({ active : false, char : null });
  };
  document.addEventListener('keydown', function (e) { e = e || window.event;
    var char = keycode(e);
    if (char === 'z' && (e.metaKey || e.ctrlKey)) {
      history[e.shiftKey ? 'next' : 'undo']();
    } else if (/backspace|up|down|left|right|tab/.test(char)) {
      // Things that affect text but have default behaviours we don't want
      e.preventDefault();
    }
    if (char.length > 1 && !/ctrl|shift|alt|command/.test(char)) {
      // A control key, but not a modifier. Character keys are captured below.
      user.interacting({ active : true, char : char });
    }
  });
  document.addEventListener('keypress', function (e) { e = e || window.event;
    var char = String.fromCharCode(e.which || e.keyCode);
    if (char && !/[\r\n]/.test(char)) {
      user.interacting({ active : true, char : char });
    }
  });
  function mouseHandler(e, x, y) {
    var screenToSvg = Snap.matrix(paper.node.getScreenCTM()).invert();
    var element = document.elementFromPoint(x, y);
    if (_.get(element, 'nodeName') === 'tspan') {
      element = element.parentElement;
    }
    user.interacting({
      x : screenToSvg.x(x, y),
      y : screenToSvg.y(x, y),
      active : e.buttons === 1 || e.button === 1,
      char : null, // Finish any keyboard interaction
      element : _.get(element, 'id') || undefined
    });
  }
  paper.mousedown(mouseHandler).mouseup(mouseHandler).mousemove(mouseHandler);

  user.use(pen);
  toolbar.penButton.mousedown(function () { user.use(pen) });
  toolbar.handButton.mousedown(function () { user.use(hand) });
  toolbar.eraserButton.mousedown(function () { user.use(eraser) });

  // Handle history and suggested futures
  var suggestor = new Suggestor(picture, history);
  function commit(action) {
    flushInteractions();
    var json = action.toJSON();
    io.publish('action', json, pass(function () {
      request.post({ url : fsUrl.append('actions'), json : json }, function (err, res, body) {
        if (err || res.statusCode !== 200) {
          // TODO: Disconnected! Retry?
          errorPage(err || body);
        }
      });
    }, errorPage));
  }
  history.on('done', function (action) {
    commit(action);
    suggestor.suggest(action);
  });
  history.on('redone', commit);
  history.on('undone', function (action) {
    // An undo is the reverse action with the forward action's ID
    commit(action.undo);
  });

  // Pause the action while we request all previous actions
  io.pause('action', pass(function (play) {
    request({ url : fsUrl.append('actions'), json : true }, pass(function (res, body) {
      return res.statusCode === 200 ?
        play(_.map(body, function (action) { return [null, action]; }), '1.id') :
        errorPage(body);
    }, errorPage));
  }, errorPage));
}, errorPage));

// Handle interactions from other users
// NOTE this needs to happen before the Io constructor callback so we get user.connected events
// for users already on the framespace
var users = {};
io.subscribe('user.connected', function (userId, json) {
  var user = users[userId] = new RemoteUser(json, picture);
  user.on('interacting', function (delta, state) {
    user.showInteraction(delta, state);
  });
});
io.subscribe('user.disconnected', function (userId) {
  _.invoke(users, [userId, 'removed']);
  delete users[userId];
});
io.subscribe('interactions', function (userId, interactions) {
  _.invoke(users, [userId, 'interact'], interactions);
});
io.subscribe('action', function (userId, json) {
  var action = picture.action.fromJSON(json), user = users[userId];
  function doAction() {
    // Just do it - don't add other people's actions to our history
    action.isOK() && action();
  }
  // Wait until inactive before committing the action
  user ? user.once('quiesced', doAction) : doAction();
});
