'use strict';

var processRule = require('./process-rule');

/**
 * init
 */
exports = module.exports = {};

/**
 *  options { }
 *  rule: 规则
 *  cookie: 客户端缓存
 *  callback: 回调函数
 */
module.exports = function(options) {
    var rule = options.rule;
    var cookie = options.cookie;

    /**
     * 处理规则
     * 透传cookie回传setCookie,以便维持登录状态
     */
    processRule({
        rule: rule,
        cookie: cookie,
        callback: function(result, setCookie) {
            options.callback(result, setCookie);
        }
    })
};
