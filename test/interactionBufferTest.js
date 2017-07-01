var assert = require('chai').assert,
    InteractionBuffer = require('../client/user/interactionBuffer.js');

describe('Interaction Buffer', function () {
  it('should flush some state', function (done) {
    var buffer = new InteractionBuffer({
      publish : function (event, interactions) {
        assert.equal(event, 'interactions');
        assert.deepEqual(interactions, [1, 2]);
        done();
      }
    });
    buffer.push(1);
    buffer.push(2);
    buffer.flush();
  });
});