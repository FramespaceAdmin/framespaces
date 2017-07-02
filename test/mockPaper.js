var window = require('svgdom'),
    SVG = require('svgjs')(window),
    paper = SVG(window.document.documentElement);

module.exports = function (width, height) {
  // svg.js mysteriously adds a child svg which can't be cleared
  paper.clear().size(width, height).select('svg').first().remove();
  return paper;
};