var _ = require('lodash');

module.exports = function Toolbar(toolPaper) {
  function previewFunc(dir) {
    function elementId(type) {
      return '#' + dir + '-' + type;
    }
    return function (present) {
      var lastPreview = toolPaper.select(elementId('preview'));
      if (lastPreview) {
        lastPreview.remove();
      }
      // Checking for e.g. present.prev.preview (function) and present.preview.prev (boolean)
      if (_.get(present, [dir, 'preview'])) {
        var paper = toolPaper.svg().attr('id', elementId('preview').slice(1)),
            preview = present[dir].preview(paper),
            bbox = preview.getBBox(),
            icon = toolPaper.select(elementId('icon')).attr('display', 'none');

        preview.attr('stroke-width', (bbox.r0 * 3) / icon.attr('width'));
        paper.attr({
          x : icon.attr('x'),
          y : icon.attr('y'),
          width : icon.attr('width'),
          height : icon.attr('height')
        });
        paper.attr('viewBox', [bbox.x - 5, bbox.y - 5, bbox.width + 10, bbox.height + 10].join(' '));
        toolPaper.select(elementId('button')).append(paper);
      } else {
        toolPaper.select(elementId('icon')).attr('display', 'block');
      }
    }
  }
  var previewUndo = previewFunc('undo');
  var previewNext = previewFunc('next');

  this.updatePreviews = function (present) {
    previewUndo(present);
    previewNext(present);
  };

  this.undoButton = toolPaper.select('#undo-button');
  this.redoButton = toolPaper.select('#next-button');

  this.penButton = toolPaper.select('#pen-button');
  this.handButton = toolPaper.select('#hand-button');
};
