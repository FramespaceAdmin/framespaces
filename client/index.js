var _ = require('lodash'),
    fs = require('./fs'),
    browser = require('./browser'),
    Picture = require('./picture'),
    History = require('./history'),
    Toolbar = require('./toolbar'),
    Suggestor = require('./suggest'),
    Point = require('kld-affine').Point2D,
    keycode = require('keycode'),
    paper = browser.svg('.paper'),
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

var toolbar = new Toolbar(browser.svg('#toolbar'), picture);
toolbar.prevButton.mousedown(function () { history.prev() });
toolbar.nextButton.mousedown(function () { history.next() });
history.on('revised', toolbar.updatePreviews);

fs.load(browser.url.root, picture, function (user, commit) {
  window.onblur = function () {
    user.interacting({ active : false, char : null });
  };
  document.addEventListener('keydown', function (e) { e = e || window.event;
    var char = keycode(e);
    if (char === 'z' && (e.metaKey || e.ctrlKey)) {
      history[e.shiftKey ? 'next' : 'prev']();
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
  var mouse;
  function svgPosition() {
    var screenToSvg = browser.svg.matrix(paper.node.getScreenCTM()).invert();
    return { x : screenToSvg.x(mouse.x, mouse.y), y : screenToSvg.y(mouse.x, mouse.y) };
  }
  function mouseHandler(e, x, y) {
    mouse = new Point(x, y);
    var element = document.elementFromPoint(x, y);
    if (_.get(element, 'nodeName') === 'tspan') {
      element = element.parentElement;
    }
    user.interacting(_.assign(svgPosition(), {
      active : e.buttons === 1,
      char : null, // Finish any keyboard interaction
      element : _.get(element, 'id') || undefined
    }));
  }
  paper.mousedown(mouseHandler).mouseup(mouseHandler).mousemove(mouseHandler);
  // If the picture view changes, silently update the user position
  picture.on('viewChanged', function () {
    user.update(svgPosition());
  });

  // Zoom with mouse wheel
  browser.hamster(paper.node).wheel(function (e, d) {
    picture.zoom(d, { x : e.originalEvent.clientX, y : e.originalEvent.clientY });
    e.preventDefault();
  });

  user.use(pen);
  toolbar.penButton.mousedown(function () { user.use(pen) });
  toolbar.handButton.mousedown(function () { user.use(hand) });
  toolbar.eraserButton.mousedown(function () { user.use(eraser) });

  // Handle history and suggested futures
  var suggestor = new Suggestor(picture, history);
  history.on('done', function (action) {
    commit(action);
    suggestor.suggest(action);
  });
  history.on('redone', commit);
  history.on('undone', function (action) {
    // An undo is the reverse action with the forward action's ID
    commit(action.un());
  });
});
