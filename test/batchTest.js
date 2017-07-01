var _ = require('lodash'),
    assert = require('chai').assert,
    SetAction = require('./setAction'),
    Batch = require('../client/action/batch');

describe('Batch action', function () {
  describe('making batches', function () {
    var seta = new SetAction({ id : 'a' });
    var setb = new SetAction({ id : 'b' });
    var setc = new SetAction({ id : 'c' });
    it('should construct an empty batch', function () {
      assert.deepEqual(new Batch([]).actions(), []);
    });
    it('should construct a singleton', function () {
      assert.deepEqual(new Batch([seta]).actions(), [seta]);
    });
    it('should construct a batch of two', function () {
      assert.deepEqual(new Batch([seta, setb]).actions(), [seta, setb]);
    });
    it('should flatten arrays', function () {
      assert.deepEqual(new Batch([seta, [setb]]).actions(), [seta, setb]);
    });
    it('should flatten batches', function () {
      assert.deepEqual(new Batch([seta, new Batch([setb])]).actions(), [seta, setb]);
    });
    it('should be created using and', function () {
      assert.deepEqual(seta.and(setb).actions(), [seta, setb]);
    });
  });

  describe('when empty', function () {
    it('should succeed whatever', function () {
      var subject = {};
      assert.isTrue(new Batch([]).isOK(subject));
      assert.isOk(new Batch([]).do(subject));
    });
    it('should undo whatever', function () {
      var subject = {};
      assert.isTrue(new Batch([]).un().isOK(subject));
      assert.isOk(new Batch([]).un().do(subject));
    });
    it('should serialise to an empty array', function () {
      assert.isArray(new Batch([]).toJSON());
      assert.lengthOf(new Batch([]).toJSON(), 0);
    });
    it('should lose its head', function () {
      assert.isTrue(new Batch([]).removeHead(new Batch([])));
      assert.isFalse(new Batch([]).removeHead(new SetAction()));
    });
  });

  describe('when singleton', function () {
    var seta = new SetAction({ id : 'a' });
    it('should report one action', function () {
      assert.lengthOf(new Batch([seta]).actions(), 1);
    });
    it('should apply the batch', function () {
      var subject = {};
      assert.isTrue(new Batch([seta]).isOK(subject));
      assert.isOk(new Batch([seta]).do(subject));
      assert.isOk(subject.a);
    });
    it('should undo the batch', function () {
      var subject = { a : true };
      assert.isTrue(new Batch([seta]).un().isOK(subject));
      assert.isOk(new Batch([seta]).un().do(subject));
      assert.isNotOk(subject.a);
    });
    it('should serialise to a single action', function () {
      assert.deepEqual(new Batch([seta]).toJSON(), [{ id : 'a', type : 'mutation' }]);
    });
    it('should lose its head', function () {
      assert.isTrue(new Batch([seta]).removeHead(new Batch([])));
      assert.isTrue(new Batch([seta]).removeHead(new Batch([seta])));
      assert.isFalse(new Batch([seta]).removeHead(new SetAction()));
      assert.isFalse(new Batch([seta]).removeHead(new Batch([seta, new SetAction({ id : 'b' })])));
    });
  });

  describe('when batch of two', function () {
    var seta = new SetAction({ id : 'a' });
    var setb = new SetAction({ id : 'b' });
    it('should apply the batch', function () {
      var subject = {};
      assert.isTrue(new Batch([seta, setb]).isOK(subject));
      assert.deepEqual(new Batch([seta, setb]).do(subject), [true, true]);
      assert.isOk(subject.a);
      assert.isOk(subject.b);
    });
    it('should undo the batch', function () {
      var subject = { a : true, b : true };
      assert.isTrue(new Batch([seta, setb]).un().isOK(subject));
      assert.isOk(new Batch([seta, setb]).un().do(subject));
      assert.isNotOk(subject.a);
      assert.isNotOk(subject.b);
    });
    it('should back out changes on failure', function () {
      var subject = {};
      assert.isNotOk(new Batch([seta, seta]).do(subject));
      assert.isNotOk(subject.a);
    });
    it('should serialise to two actions', function () {
      assert.deepEqual(new Batch([seta, setb]).toJSON(), [
        { id : 'a', type : 'mutation' }, { id : 'b', type : 'mutation' }
      ]);
    });
    it('should lose an empty head', function () {
      var batch = new Batch([seta, setb]);
      assert.isTrue(batch.removeHead(new Batch([])));
      assert.deepEqual(batch.actions(), [seta, setb]);
    });
    it('should lose its head', function () {
      var batch = new Batch([seta, setb]);
      assert.isTrue(batch.removeHead(new Batch([seta])));
      assert.deepEqual(batch.actions(), [setb]);
    });
    it('should lose its whole body', function () {
      var batch = new Batch([seta, setb]);
      assert.isTrue(batch.removeHead(new Batch([seta, setb])));
      assert.deepEqual(batch.actions(), []);
      assert.isFalse(new Batch([seta, setb]).removeHead(new SetAction()));
      assert.isFalse(new Batch([seta, setb]).removeHead(new Batch([seta, setb, new SetAction({ id : 'c' })])));
    });
    it('should not lose an unmatching head', function () {
      var batch = new Batch([seta, setb]);
      assert.isFalse(batch.removeHead(new SetAction()));
      assert.deepEqual(batch.actions(), [seta, setb]);
      assert.isFalse(new Batch([seta, setb]).removeHead(new Batch([seta, setb, new SetAction({ id : 'c' })])));
    });
    it('should lose a matching superset body but report incomplete', function () {
      var batch = new Batch([seta, setb]);
      assert.isFalse(batch.removeHead(new Batch([seta, setb, new SetAction({ id : 'c' })])));
      assert.deepEqual(batch.actions(), []);
    });
  });
});
