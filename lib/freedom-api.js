'use strict';

var ProcessRule = require('./process-rule');

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
    var processRule = new ProcessRule();
    
    //注册插件
    if(options && options.plugins) {
        if(options.plugins instanceof Array) {
            for(var i=0; i<options.plugins.length; i++ ) {
                processRule.apply(options.plugins[i]);
            }
        } else {
             processRule.apply(options.plugins);
        }
    }

    /**
     * 处理规则
     * 透传cookie回传setCookie,以便维持登录状态
     */
    processRule.process({
        rule: rule,
        cookie: cookie,
        callback: function(result, setCookie) {
            options.callback(result, setCookie);
        }
    });

};
