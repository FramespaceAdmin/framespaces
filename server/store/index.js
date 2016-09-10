

function Store() {}

/**
 * Fetch an array of filtered data
 * @param type the object type
 * @param filter per http://www.taffydb.com/writingqueries
 * @param cb callback with error and filtered data
 */
Store.prototype.get = function (type, filter, cb/*(err, [data])*/) {
  throw undefined;
};

/**
 * Inserts the given object
 * @param type the object type
 * @param data object or array of objects to insert
 * @param cb callback
 */
Store.prototype.insert = function (type, data, cb/*(err)*/) {
  throw undefined;
};

/**
 * Removes the given filtered objects
 * @param type the object type
 * @param filter per http://www.taffydb.com/writingqueries
 * @param cb callback with error and removed count
 */
Store.prototype.remove = function (type, filter, cb/*(err, count)*/) {
  throw undefined;
};

module.exports = Store;
