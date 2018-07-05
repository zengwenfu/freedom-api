'use strict';

const ProcessRule = require('./process-rule');

module.exports = function({processes, initCookie, callback}) {

    const processRule = new ProcessRule();

    // regist plugin
    if(plugins) {
      for (let i = 0; i < plugins.length; i++) {
        plugins[i](processRule);
      }
    }

    // star process
    processRule.start({
        processes,
        initCookie,
        callback: function(data) {
          callback(data);
        }
    });

};
