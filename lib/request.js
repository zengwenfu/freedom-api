const request = require('request');

/**
 * options: {
 * 
 * }
 *     url:  请求地址 必填
 *     type: 默认get 可选
 *     params: {} 请求参数
 *     callback: 请求回调
 *     
 */
module.exports = function(options) {
  return new Promise((resolve) => {
    request(options, function(e, r, b) {
      if (!e) {
        resolve({
          success: 0,
          body: b,
          headers: r.headers
        });
      } else {
        console.log(e)
        resolve({
          success: -1
        });
      }
    });
  });
};


