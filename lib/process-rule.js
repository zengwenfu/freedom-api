'use strict';

var request = require('./request');

//全局变量
var rule = false;
var result = false;
var reqCookies = false;
var setCookies = false;

/**
 * 创建promise
 */
var createPromise = function(options) {
    return new Promise(function(resolve, reject) {
        options.callback = function(data, _setCookies) {
            if(!setCookies) {
                setCookies = _setCookies;
            }
            resolve(data);
        }
        request(options, reqCookies);
    });
}



/**
 * 规则解析
 */
var processRule = function(options, callback) {

    var pro = false;
    var isAll = false;//是不是all请求
    var allthen = false;//all请求的then(为false是无then)
    //如果是数组要用all
    if(options instanceof Array) {
        isAll = true;
        var promises = options.map(function(obj) {

            //约定数组的最后一项（带then指针）
            if(obj.hasOwnProperty('then')) {
                    allthen = obj['then'];
            }

            return createPromise(obj);
        });
    
        pro = Promise.all(promises);
    } else {
        pro = createPromise(options);
    }

    pro.then(function(data) {
        //如果是all,那么要对数组里面的项目进行解析,同时判断需不需要把数据带回去
        if(isAll) {
            data = data.map(function(str, index) {
                var obj;

                //返回值无法以json结构解析，那么肯定是报错了
                try {
                    obj = JSON.parse(str);
                } catch(e) {
                    throw new Error(str);
                }

                if(options[index].name && options[index].result) {
                    result[options[index].name + 'Data'] = obj;
                }
                return obj;
            });
        } else {
            //返回值无法以json格式解析，那么肯定是报错了
            try {
                data = JSON.parse(data);
            } catch(e) {
                console.log(e.stack);
                throw new Error(data);
            }
            
            if(options.name && options.result) {
                result[options.name + 'Data'] = data;
            }   
        }

        
        //执行数据校验
        if(!!rule.dataTest && rule.dataTest.indexOf('$data') >= 0) {
            if(isAll) {//如果是all请求，那么要对data数组中的每一项进行校验
                for(var i = 0; i < data.length; i++) {
                    var dataTest = rule.dataTest.replace('$data', 'data[' + i + ']');
                    if(!eval(dataTest)){
                        //把错误抛出去
                        throw new Error(data[i].msg);
                    }
                }
            } else {
                var dataTest = rule.dataTest.replace('$data', 'data');
                if(!eval(dataTest)) {//接口报错，不需要向下执行了
                    //把错误抛出去
                    throw new Error(data.msg);
                }
            }
        } 

        //判断有没有下一步
        if((isAll && allthen) || options.then) {
            if(!isAll) {
                options = rule[options.then];
            } else {
                options = rule[allthen];
            }
            //判断下一步是不是all
            if(options instanceof Array) {
                options = options.map(function(obj) {
                    var params = obj.params;
                    for(var key in params) {
                        var param = params[key].toString();
                        if(param.indexOf('$data') === 0) {
                            param = param.replace('$data', 'data');
                            //用eval会有xxl注入的危险,要做好参数验证
                            params[key] = eval(param);
                        }
                    }

                    return obj;
                });
            } else {
                var params = options.params;
                for(var key in params) {
                    var param = params[key].toString();
                    if(param.indexOf('$data') === 0) {
                        param = param.replace('$data', 'data');
                        //用eval会有xxl注入的危险,要做好参数验证
                        params[key] = eval(param);
                    }
                }
            }

            return processRule(options, callback);

        } else { //如果没有下一步, 执行回调
            callback && callback(result, setCookies);
        }
    }).catch(function(error) {
        console.log(error.stack);
        var errorObj = {
            msg: error.toString()
        };
        result['error'] = errorObj;
        callback(result, setCookies);
    });
}


module.exports = function(req, callback) {
    rule = JSON.parse(req.body.rule);;
    result = {};
    reqCookies = req.get('Cookie');
    processRule(rule.start, callback);
}

