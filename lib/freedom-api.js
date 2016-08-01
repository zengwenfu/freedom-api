'use strict';

var processRule = require('./process-rule');

/**
 * init
 */
exports = module.exports = {};

module.exports = function(rule, cookie, callback) {
    /**
     * 处理规则
     * 透传cookie回传setCookie,以便维持登录状态
     */
    processRule(rule, cookie, function(result, setCookie) { 
          //返回处理结果，以及setCookie
          callback(result, setCookie);
    });
};
