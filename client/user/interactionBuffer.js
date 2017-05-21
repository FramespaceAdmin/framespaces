function InteractionBuffer(io) {
  this.buffer = [];
  this.io = io;
}

InteractionBuffer.prototype.push = function (state) {
  if (!this.buffer.length) {
    setTimeout(_.bind(this.flush, this), 100);
  }
  this.buffer.push(state);
};

InteractionBuffer.prototype.flush = function () {
  if (this.buffer.length) {
    this.io.publish('interactions', this.buffer.splice(0, this.buffer.length));
  }
};

module.exports = InteractionBuffer;
