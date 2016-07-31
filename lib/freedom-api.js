'use strict';

var request = require('./request');

/**
 * init
 */
exports = module.exports = {};

module.exports.do = function(req, res, next) {
    var rule = JSON.parse(req.body.rule);
    var options = rule.getScoreByUserId;
    options.callback = function(data) {
        res.send(data);
    }
    request(options);
};
