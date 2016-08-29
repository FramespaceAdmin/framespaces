var _ = require('lodash'),
    Snap = require('snapsvg'),
    Picture = require('./picture'),
    History = require('./history'),
    Toolbar = require('./toolbar'),
    Suggestor = require('./suggest'),
    LocalUser = require('./user/local'),
    RemoteUser = require('./user/remote'),
    keycode = require('keycode'),
    fsIO = io(window.location + '/io'),
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

// Add the current user and wire up events
fsIO.on('connect', function () {
  var user = new LocalUser(fsIO.id);
  // Send interactions in batches
  var interactions = [];
  function flushInteractions() {
    if (interactions.length) {
      fsIO.emit('interactions', interactions.splice(0, interactions.length));
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
    fsIO.emit('action', action.toJSON());
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
});

// Handle interactions from other users
var users = {};
fsIO.on('user.connected', function (json) {
  var user = users[json.id] = new RemoteUser(json, picture);
  user.on('interacting', function (delta, state) {
    user.showInteraction(delta, state);
  });
});
fsIO.on('user.disconnected', function (id) {
  users[id].removed();
  delete users[id];
});
fsIO.on('interactions', function (userId, interactions) {
  users[userId].interact(interactions);
});
fsIO.on('action', function (userId, json) {
  var action = picture.action.fromJSON(json), user = users[userId];
  function doAction() {
    // Just do it - don't add other people's actions to our history
    action.isOK() && action();
  }
  // Wait until inactive before committing the action
  user ? user.once('quiesced', doAction) : doAction();
});
