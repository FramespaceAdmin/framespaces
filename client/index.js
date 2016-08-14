var _ = require('lodash'),
    Snap = require('snapsvg'),
    Picture = require('./picture'),
    History = require('./history'),
    Toolbar = require('./toolbar'),
    Suggestor = require('./suggest'),
    User = require('./user'),
    keycode = require('keycode'),
    fsIO = io(window.location + '/io'),
    paper = Snap('.paper'),
    picture = new Picture(paper),
    history = new History(picture),
    users = {};

function makeTool(constructor) {
  var tool = new constructor(picture);
  tool.on('finished', function (action) {
    action.description = tool.constructor.name;
    action.isUser = true;
    history.step(action);
  });
  return tool;
}

var pen = makeTool(require('./tool/pen')),
    hand = makeTool(require('./tool/hand')),
    eraser = makeTool(require('./tool/eraser'));

var toolbar = new Toolbar(Snap('#toolbar'));
toolbar.undoButton.mousedown(history.undo);
toolbar.redoButton.mousedown(history.next);
history.on('revised', toolbar.updatePreviews);

function addUser(json) {
  return users[json.id] = new User(paper, json);
}

// Add the current user and wire up events
fsIO.on('connect', function () {
  var user = addUser({ id : fsIO.id });
  user.on('interacting', function (delta, state) {
    fsIO.emit('interaction', state);
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
  paper.mousedown(mouseHandler).mousemove(mouseHandler);

  function cursor(which, p) {
    paper.attr('style', 'cursor: url(/web/' + which.toLowerCase() + '.svg) ' + p.x + ' ' + p.y + ', auto;');
  }
  var tool;
  function use(newTool) {
    _.invoke(tool, 'deactivate');
    user.use(tool = newTool);
    _.invoke(tool, 'activate');
    cursor(tool.constructor.name, tool.offset);
  }
  use(pen);
  toolbar.penButton.mousedown(function () { use(pen) });
  toolbar.handButton.mousedown(function () { use(hand) });
  toolbar.eraserButton.mousedown(function () { use(eraser) });
});

// Handle interactions from other users
fsIO.on('user.connected', function (json) {
  var user = addUser(json);
  user.on('interacting', user.showInteraction);
});
fsIO.on('user.disconnected', function (id) {
  users[id].removed();
  delete users[id];
});
fsIO.on('interaction', function (userId, state) {
  var user = users[userId];
  if (!user.isUsing(state.tool)) {
    user.use(new (require('./tool/' + state.tool.toLowerCase()))(picture));
  }
  user.interacting(state);
});

// Handle history and suggested futures
var suggestor = new Suggestor(picture, history);
function commit(action) {
  fsIO.emit('action', action.toJSON());
}
history.on('done', function (action) {
  commit(action);
  suggestor.suggest(action);
});
history.on('redone', commit);
history.on('undone', function (action) {
  // An undo is the reverse action with the forward action's ID
  fsIO.emit('action', action.undo.toJSON());
});
fsIO.on('action', function (json) {
  var action = picture.action.fromJSON(json);
  // Just do it - don't add other people's actions to our history
  action.isOK() && action();
});
