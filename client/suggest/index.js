var _ = require('lodash'),
    log = require('../../lib/log');

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
      var action = suggestor(picture, lastAction);
      if (action) {
        action.description = name + ' @ ' + Number(action.confidence.toFixed(3));
        return action;
      }
    }).compact().sortBy('confidence').reverse().takeWhile(function (action) {
      return action.confidence > 0.5;
    }).value();

    if (!_.isEmpty(suggestions)) {
      log.info('suggestions', ':', _.map(suggestions, 'description').join(', '));
    }

    var action = _.get(_.first(suggestions), 'confidence') > 0.9 ? suggestions.shift() : null;
    history.add(suggestions);
    history.step(action);
  };
};
