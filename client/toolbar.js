var _ = require('lodash');

module.exports = function Toolbar(toolPaper, picture) {
  function previewFunc(dir) {
    function elementId(type) {
      return dir + '-' + type;
    }
    function select(type) {
      return toolPaper.select('#' + elementId(type));
    }
    return function (present) {
      select('preview') && select('preview').remove();
      select('icon').attr('display', 'block');

      if (_.get(present, [dir, 'preview'])) {
        var paper = toolPaper.svg().attr('id', elementId('preview')),
            preview = present[dir].preview(picture, paper), bbox, icon;
        if (preview) {
          bbox = preview.getBBox();
          icon = select('icon').attr('display', 'none');
          preview.attr('stroke-width', (bbox.r0 * 3) / icon.attr('width'));
          paper.attr({
            x : icon.attr('x'),
            y : icon.attr('y'),
            width : icon.attr('width'),
            height : icon.attr('height')
          });
          paper.attr('viewBox', [bbox.x - 5, bbox.y - 5, bbox.width + 10, bbox.height + 10].join(' '));
          select('button').append(paper);
        } else {
          paper.remove();
        }
      }
    }
  }
  var previewUndo = previewFunc('prev');
  var previewNext = previewFunc('next');

  this.updatePreviews = function (present) {
    previewUndo(present);
    previewNext(present);
  };

  this.prevButton = toolPaper.select('#prev-button');
  this.nextButton = toolPaper.select('#next-button');

  this.eraserButton = toolPaper.select('#eraser-button');
  this.penButton = toolPaper.select('#pen-button');
  this.handButton = toolPaper.select('#hand-button');
};
