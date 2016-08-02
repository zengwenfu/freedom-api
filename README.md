# freedom-api
>通行后端接口合并方案，基于node实现的框架，接口的控制权转移到前端，让接口更自由

## web开发的困境
在web开发中，前端为了一个实现一个功能，连续的请求多个接口的场景并不少见，后一个接口依赖于前一个接口的请求结果，于是你经常要这样去组织你的接口请求then -> then -> then 或者 then -> all[] -> then（不出现层层嵌套已经不错了）。然而问题并不只是写法难看而已：

![图一](https://github.com/zengwenfu/note/blob/master/images/server-api.png)
图中的示例，step2要等待step1跟api-server的交互完成，以step1的结果作为参数再去请求服务器，而step3同样的要等待step2

## 特点
1. 通用性

## 前提是接口的返回值以json格式定义

```
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
            then: 'getScoreByUserId'
        }
    ],
    getScoreByUserId: [
        {
            url: 'http://localhost:3000/users/getScoreByUserId',
            type: 'get',
            name: 'userScore',
            params: {
                userid: '$data[0].data.id'
            },
            result: true
        }, {
            url: 'http://localhost:3000/users/setScore',
            type: 'post',
            name: 'setScore',
            params: {
                score: 10
            },
            result: false,
            then: 'setScore'
        }
    ],
    // getScoreByUserId: {
    //     url: 'http://localhost:3000/users/getScoreByUserId',
    //     type: 'get',
    //     name: 'userScore',
    //     params: {
    //         userid: '$data[0].data.id'
    //         // userid: '5'
    //     },
    //     result: true,
    //     then: 'setScore',
    // },
    // start: {
    //     url: 'http://localhost:3000/users/getUserInfo',
    //     type: 'get',
    //     name: 'userInfo',
    //     params: {},
    //     result: true,
    //     then: 'getScoreByUserId'
    // },
    // getScoreByUserId: {
    //     url: 'http://localhost:3000/users/getScoreByUserId',
    //     type: 'get',
    //     name: 'userScore',
    //     params: {
    //         userid: '$data.data.id'
    //         // userid: '5'
    //     },
    //     result: true,
    //     then: 'setScore',
    // },
    setScore: {
        url: 'http://localhost:3000/users/setScore',
        type: 'post',
        name: 'setScore',
        params: {
            score: 10
        },
        result: false,
        then: false
    }
};
```