'use strict';

var processRule = require('./process-rule');

/**
 * init
 */
exports = module.exports = {};

module.exports.do = function(req, res, next) {
    var rule = JSON.parse(req.body.rule);
    //处理规则
    processRule(rule, function(result) {
        res.send(JSON.stringify(result));
    });
};
