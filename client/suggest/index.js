var _ = require('lodash');

module.exports = function Suggestor(picture, history) {
  this.suggest = function(lastAction) {
    var suggestions = {
      simplify : require('./simplify')(picture, lastAction.result),
      rectify : require('./rectify')(picture, lastAction.result),
      snap : require('./snap')(picture, lastAction.result),
      arcify : require('./arcify')(picture, lastAction.result),
      rect : require('./rect')(picture, lastAction.result),
      link : require('./link')(picture, lastAction.result),
      label : require('./label')(picture, lastAction.result),
      scribble : require('./scribble')(picture, lastAction.result)
    }, sorted = _.reverse(_.sortBy(_.compact(_.values(suggestions)), 'confidence'));

    console.log(_.mapValues(suggestions, 'confidence'));

    var action = _.get(_.first(sorted), 'confidence') > 0.9 ? sorted.shift() : null;
    history.add(_.takeWhile(sorted, function (suggestion) {
      return suggestion.confidence > 0.5;
    }));
    history.step(action);
  };
};
