var as = require('yavl'),
    GUID = /^[a-f][a-f0-9]{31}$/;

// TODO: Not yet used

module.exports = as({
  id : GUID,
  type : as('addition', 'removal', 'replacement', 'mutation'),
  element : GUID,
  shape : as.defined('shape', {
    name : as('text', 'tspan', 'polygon', 'polyline', 'line', 'rect', 'ellipse', 'circle', 'path', Error),
    attr : as({ undefined : as(String, Number) }).size(as.lte(100)),
    text : as(String).size(as.lte(1000)).or(undefined),
    children : as([as.defined('shape')]).or(undefined),
    bbox : { x : Number, y : Number, width : Number, height : Number, undefined : Error },
    undefined : Error
  }),
  isUndo : Boolean
});
