var _ = require('lodash');

var suggest = {
  simplify : require('./simplify'),
  rectify : require('./rectify'),
  snap : require('./snap'),
  arcify : require('./arcify'),
  link : require('./link'),
  label : require('./label'),
  scribble : require('./scribble')
};

module.exports = function Suggestor(picture, history) {
  this.suggest = function(lastAction) {
    var suggestions = _(suggest).map(function (suggestor, name) {
      var action = suggestor(picture, lastAction.result);
      if (action) {
        return { action : action, confidence : action.confidence, name : name };
      }
    }).compact().sortBy('confidence').reverse().takeWhile(function (suggestion) {
      return suggestion.confidence > 0.5;
    }).value();

    var message = _.transform(suggestions, function (message, suggestion) {
      return _.set(message, suggestion.name, Number(suggestion.confidence.toFixed(3)));
    }, {});
    if (!_.isEmpty(message)) {
      console.log(message);
    }

    var action = _.get(_.first(suggestions), 'confidence') > 0.9 ? suggestions.shift().action : null;
    history.add(_.map(suggestions, 'action'));
    history.step(action);
  };
};
