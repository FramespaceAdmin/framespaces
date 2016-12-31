var Tool = require('../client/tool');

function MockTool(picture) {
  Tool.call(this, picture);
}

MockTool.prototype = Object.create(Tool.prototype);
MockTool.prototype.constructor = MockTool;

MockTool.prototype.using = function using(delta, state) {
  this.delta = delta;
  this.state = state;
};

module.exports = MockTool;
