'use strict';

var request = require('./request');

var rule = {
    dataTest: '$data.code === "0"',
    start: {
        url: 'http://localhost:3000/users/getUserInfo',
        type: 'get',
        name: 'userInfo',
        params: {},
        result: true,
        next: 'getScoreByUserId'
    },
    getScoreByUserId: {
        url: 'http://localhost:3000/users/getScoreByUserId',
        type: 'get',
        name: 'userScore',
        params: {
            userid: '$data.data.id'
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
    
    return createPromise(options).then(function(data) {
        console.log(data);
        data = JSON.parse(data);
        //执行数据校验
        if(!!rule.dataTest && rule.dataTest.indexOf('$data') >= 0) {
            var dataTest = rule.dataTest.replace('$data', 'data');
            if(!eval(dataTest)) {//接口报错，不需要向下执行了
                console.log(data.msg);
                //TODO
                return ;
            }
        }

        if(options.next) {
            options = rule[options.next];
            var params = options.params;
            //参数赋值
            for(var key in params){
                var param = params[key].toString();
                if(param.indexOf('$data') === 0) {
                    param = param.replace('$data', 'data');
                    //用eval会有xxl注入的危险,要做好参数验证
                    params[key] = eval(param);
                }
            }
            //创建下一个动作
            return processRule(options);
        }
    }).catch(function(error) {
        console.log(error);
    });
}

processRule(rule.start);





