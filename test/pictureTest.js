var _ = require('lodash'),
    assert = require('chai').assert,
    guid = require('../lib/guid'),
    Picture = require('../client/picture'),
    MockPaper = require('./mockPaper');

describe('Picture', function () {
  it('should get an element by id', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper), id = guid();
    var line = paper.line(0, 0, 1, 1).attr('id', id);
    picture.changed(line);
    assert.equal(picture.getElement(id), line);
  });

  it('should get identified visible elements', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var line = paper.line(0, 0, 1, 1).attr('id', guid());
    var unidentifiedLine = paper.line(1, 0, 2, 1);
    var invisibleLine = paper.line(2, 0, 3, 1).attr('id', guid());
    invisibleLine.node.style.display = 'none';
    picture.changed([line, unidentifiedLine, invisibleLine]);
    assert.deepEqual(picture.elements({ x : 0, y : 0, width : 10, height : 10 }), [line]);
  });

  it('should get elements by query selector', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var line = paper.line(0, 0, 1, 1).attr('id', guid()).addClass('fred');
    picture.changed(line);
    assert.deepEqual(picture.elements('.fred'), [line]);
  });

  it('should limit elements by view box', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var line = paper.line(100, 0, 101, 1).attr('id', guid());
    picture.changed(line);
    assert.deepEqual(picture.elements({ x : 0, y : 0, width : 10, height : 10 }), []);
  });

  it('should not find removed elements', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var line = paper.line(1, 1, 2, 2).attr('id', guid());
    picture.changed(line);
    picture.changed(line.remove());
    assert.deepEqual(picture.elements({ x : 0, y : 0, width : 10, height : 10 }), []);
  });

  it('should get elements by filter', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper), id = guid();
    var line = paper.line(0, 0, 1, 1).attr('id', id);
    picture.changed(line);
    assert.deepEqual(picture.elements({ x : 0, y : 0, width : 10, height : 10 }, function (e) {
      return e.node.id = id;
    }), [line]);
  });

  it('should get elements linking to an element', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var rect1 = paper.rect(0, 0, 1, 2).attr('id', guid()),
        rect2 = paper.rect(2, 0, 1, 2).attr('id', guid()),
        rect3 = paper.rect(4, 0, 1, 2).attr('id', guid()),
        link1 = paper.line(1, 1, 2, 1).attr({
          id : guid(), from : rect1.node.id, to : rect2.node.id
        }).addClass('link'),
        link2 = paper.line(3, 1, 4, 1).attr({
          id : guid(), from : rect2.node.id, to : rect3.node.id
        }).addClass('link'),
        label = paper.text(2, 1, 'rect2').attr({
          id : guid(), on : rect2.node.id
        }).addClass('label');
    picture.changed([rect1, rect2, rect3, link1, link2, label]);
    assert.deepEqual(picture.inLinks(rect2.node.id), [link1, link2, label]);
  });

  it('should order elements to prevent occlusion', function () {
    var paper = MockPaper(10, 10), picture = new Picture(paper);
    var rect1 = paper.rect(1, 1, 1, 1).attr('id', guid()),
        rect2 = paper.rect(0, 0, 3, 3).attr('id', guid());
    picture.changed([rect1, rect2]);
    assert.deepEqual(_.toArray(paper.node.getElementsByTagName('rect')), [rect2.node, rect1.node]);
  });
});
