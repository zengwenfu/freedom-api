'use strict';

var request = require('./request');

var rule = {
    dataTest: '$data.code === "0"',
    start: [
        {
            url: 'http://localhost:3000/users/getUserInfo',
            type: 'get',
            name: 'userInfo',
            params: {},
            result: true
        }, {
            url: 'http://localhost:3000/users/setScore',
            type: 'post',
            name: 'setScore',
            params: {
                score: 10
            },
            result: false,
            next: 'getScoreByUserId'
        }
    ],
    getScoreByUserId: {
        url: 'http://localhost:3000/users/getScoreByUserId',
        type: 'get',
        name: 'userScore',
        params: {
            userid: '$data[0].data.id'
            // userid: '5'
        },
        result: true,
        next: 'setScore',
    },
    setScore: {
        url: 'http://localhost:3000/users/setScore',
        type: 'post',
        name: 'setScore',
        params: {
            score: 10
        },
        result: false,
        next: false
    }
};

var createPromise = function(options) {
    return new Promise(function(resolve, reject) {
        var oldCallback = options.callback;
        options.callback = function(data) {
            oldCallback && oldCallback();
            resolve(data);
        }
        request(options);
    });
}




function processRule(options) {

    var pro = false;
    var isAll = false;//是不是all请求
    var allnext = false;//all请求的next(为false是无next)
    //如果是数组要用all
    if(options instanceof Array) {
        isAll = true;
        var promises = options.map(function(obj) {

            //约定数组的最后一项（带next指针）
            if(obj.hasOwnProperty('next')) {
                    allnext = obj['next'];
            }

            return createPromise(obj);
        });
    
        pro = Promise.all(promises);
    } else {
        pro = createPromise(options);
    }

    pro.then(function(data) {
        console.log(data);
        //如果是all,那么要对数组里面的项目进行解析
        if(isAll) {
            data = data.map(function(str) {
                return JSON.parse(str);
            });
        } else {
            data = JSON.parse(data);    
        }
        
        //执行数据校验
        if(!!rule.dataTest && rule.dataTest.indexOf('$data') >= 0) {
            if(isAll) {//如果是all请求，那么要对data数组中的每一项进行校验
                for(var i = 0; i < data.length; i++) {
                    var dataTest = rule.dataTest.replace('$data', 'data[' + i + ']');
                    if(!eval(dataTest)){
                        console.log(data[i].msg);
                        //TODO
                        return ;
                    }
                }
            } else {
                var dataTest = rule.dataTest.replace('$data', 'data');
                if(!eval(dataTest)) {//接口报错，不需要向下执行了
                    console.log(data.msg);
                    //TODO
                    return ;
                }
            }
        } 

        //判断有没有下一步
        if((isAll && allnext) || options.next) {
            if(!isAll) {
                options = rule[options.next];
            } else {
                options = rule[allnext];
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

            return processRule(options);

        } else { //如果没有下一步

        }
    }).catch(function(error) {
        //TODO 报错的时候应该怎么办
        console.log(error.stack);
    });
}

processRule(rule.start);





