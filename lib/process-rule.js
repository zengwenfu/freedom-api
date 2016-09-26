'use strict';

var request = require('./request');
var Tapable = require('tapable');

//全局变量
var rule = false;
var result = false;
var reqCookie = false;
var setCookie = false;

/**
 * 创建promise
 */
ProcessRule.prototype.createPromise = function(options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        //请求之前事件
        self.applyPluginsAsyncWaterfall('before-request', options, function(err, resOptions) {
            if(err) {
                console.log(err.stack);
                resolve(err);
                return ;
            }
            resOptions.callback = function(data, _setCookie) {
                if (!setCookie) {
                    setCookie = _setCookie;
                }
                self.applyPluginsAsyncWaterfall('after-request', data, function(e, resData) {
                    if(e) {
                        console.log(e.stack);
                        resolve(e);
                        return;
                    }
                    resolve(resData);
                });
            }
            request(resOptions, reqCookie);
        });
    });
}



/**
 * 规则解析
 */
ProcessRule.prototype.processRule = function(options, callback) {
    var self = this;
    var pro = false;
    var isAll = false; //是不是all请求
    var allthen = false; //all请求的then(为false是无then)
    //如果是数组要用all
    if (options instanceof Array) {
        isAll = true;
        var promises = options.map(function(obj) {

            //约定数组的最后一项（带then指针）
            if (obj.hasOwnProperty('then')) {
                allthen = obj['then'];
            }

            return self.createPromise(obj);
        });

        pro = Promise.all(promises);
    } else {
        pro = self.createPromise(options);
    }

    pro.then(function(data) {
        self.applyPluginsAsyncWaterfall('get-data', data, function(err, resData) {
            if(err) {
                console.log(err.stack);
                throw err;
            }
            //如果是all,那么要对数组里面的项目进行解析,同时判断需不需要把数据带回去
            if (isAll) {
                resData = resData.map(function(str, index) {
                    var obj;

                    //返回值无法以json结构解析，那么肯定是报错了
                    try {
                        obj = JSON.parse(str);
                    } catch (e) {
                        throw new Error(str);
                    }

                    if (options[index].name && options[index].result) {
                        result[options[index].name + 'Data'] = obj;
                    }
                    return obj;
                });
            } else {
                //返回值无法以json格式解析，那么肯定是报错了
                try {
                    resData = JSON.parse(resData);
                } catch (e) {
                    console.log(e.stack);
                    throw new Error(resData);
                }

                if (options.name && options.result) {
                    result[options.name + 'Data'] = resData;
                }
            }


            //执行数据校验
            if (!!rule.dataTest && rule.dataTest.indexOf('$data') >= 0) {
                if (isAll) { //如果是all请求，那么要对data数组中的每一项进行校验
                    for (var i = 0; i < resData.length; i++) {
                        var dataTest = rule.dataTest.replace('$data', 'resData[' + i + ']');
                        if (!eval(dataTest)) {
                            //把错误抛出去
                            if (!rule.errorMsg) {
                                throw new Error('error');
                            } else {
                                throw new Error(eval('resData[i].' + rule.errorMsg));
                            }
                        }
                    }
                } else {
                    var dataTest = rule.dataTest.replace('$data', 'resData');
                    if (!eval(dataTest)) { //接口报错，不需要向下执行了
                        //把错误抛出去
                        if (!rule.errorMsg) {
                            throw new Error('error');
                        } else {
                            throw new Error(eval('resData.' + rule.errorMsg));
                        }
                    }
                }
            }

            //判断有没有下一步
            if ((isAll && allthen) || options.then) {
                if (!isAll) {
                    options = rule[options.then];
                } else {
                    options = rule[allthen];
                }
                //判断下一步是不是all
                if (options instanceof Array) {
                    options = options.map(function(obj) {
                        var params = obj.params;
                        for (var key in params) {
                            var param = params[key].toString();
                            if (param.indexOf('$data') === 0) {
                                param = param.replace('$data', 'resData');
                                //用eval会有xxl注入的危险,要做好参数验证
                                params[key] = eval(param);
                            }
                        }

                        return obj;
                    });
                } else {
                    var params = options.params;
                    for (var key in params) {
                        var param = params[key].toString();
                        if (param.indexOf('$data') === 0) {
                            param = param.replace('$data', 'resData');
                            //用eval会有xxl注入的危险,要做好参数验证
                            params[key] = eval(param);
                        }
                    }
                }

                return self.processRule(options, callback);

            } else { //如果没有下一步, 执行回调
                callback && callback(result, setCookie);
            }
        });
    }).catch(function(error) {
        var step = false;
        if(options instanceof Array) {
            step = options[0].name;
        } else {
            step = options.name;
        }
        var errorObj = {
            msg: error.toString(),
            step: step
        };
        result['error'] = errorObj;
        callback(result, setCookie);
    });
}

/**
 * 开始解析
 */
ProcessRule.prototype.process = function(options) {
    var self = this;

    //抛出事件start-process，以便插件切入
    this.applyPluginsAsyncWaterfall('start-process', options.rule, function(err, resRule) {
        if(err) {
            console.log(err.stack);
            var errorObj = {
                msg: err.toString,
                setp: '0'
            }
            var result = {
                error: errorObj
            };
            options.callback(result);
            return ;
        }
        reqCookie = options.cookie;
        rule = resRule;
        result = {};
        self.processRule(rule.start, options.callback);
    });
}


function ProcessRule() {
    Tapable.call(this);
}

Tapable.mixin(ProcessRule.prototype);


/**
 * options {}
 * rule: 规则
 * cookie: 客户端cookie
 * callback: 回调函数
 */
module.exports = ProcessRule;
