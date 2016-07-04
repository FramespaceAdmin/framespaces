module.exports = function guid() {
  var d = new Date().getTime();
  return 'axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[ax]/g, function(c) {
      return ((d + Math.random()*16)%(c == 'a' ? 6 : 16) + (c == 'a' ? 10 : 0) | 0).toString(16);
  });
}
