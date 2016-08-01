'use strict';

var processRule = require('./process-rule');

/**
 * init
 */
exports = module.exports = {};

module.exports.do = function(req, res, next) {
    //处理规则
    processRule(req, function(result, setCookies) { 
          res.append('Set-Cookie', setCookies);
          res.send(JSON.stringify(result));
    });
};
