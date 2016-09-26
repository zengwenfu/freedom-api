'use strict';
var http = require('http');
var querystring = require('querystring');
var url = require('url');

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
module.exports = function(options, cookie) {

    var URL = url.parse(options.url);
    var type = options.type.toUpperCase() || 'GET';
    
    //处理cookie
    cookie = cookie || '';

    //处理请求参数
    var contents = false;
    if(!!options.params) {
        contents = querystring.stringify(options.params);
    }

    //如果是get,把参数跟在url后面
    var path = URL.path;
    if(type === 'GET' && contents) {
        path = path + '?' + contents;
    }

    var requestOptions = {
        host: URL.hostname,
        port: URL.port,
        path: path,
        method: type,
        headers: {
            Cookie: cookie
        }
    };

    if(type ==='POST' && contents) {
        requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        requestOptions.headers['Content-Length'] = contents.length;
    }

    var req = http.request(requestOptions, function(res) {
        res.setEncoding('UTF-8');
        var str = '';
        res.on('data', function(chunk) {
           str = str + chunk;
        });

        res.on('end', function() {
            var setCookie = res.headers['set-cookie'];
            //执行回调
            options.callback && options.callback(str, setCookie);
        });

        res.on('error', function(e) {
            options.callback && options.callback(e);
        });
    });

    req.on('error', function(e) {
         options.callback && options.callback(e);
    });

    //post请求，需要把请求体发送过去
    if(type === 'POST' && contents) {
        req.write(contents);
    }

    req.end();

};


