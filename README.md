# freedom-api
>通行后端接口合并方案，基于node实现的框架，接口的控制权转移到前端，让接口更自由

## web开发的困境
![](https://github.com/zengwenfu/note/blob/master/images/server-api.png)![](https://github.com/zengwenfu/note/blob/master/images/server-api-all.png)
>在web开发中，前端为了一个实现一个功能，连续的请求多个接口的场景并不少见。图一示例中，后一个接口依赖于前一个接口的请求结果，于是你经常要这样去组织你的接口请求step1.then(step2).then(step3) 或者（不出现层层嵌套已经不错了），图二中，step1,step2,step3虽然没有依赖关系，但是同样需要跟api-server交互三次，对于用户来说，这将是无尽的等待。你可能会抱怨后端的同事，为何不把这几个接口合并，然而后端的同事就会反驳你，你这个页面需要step1->step2->step3，那个页面只需要step1 -> step2，甚至有些页面只需要step1，我如何给你合并？确实，接口提供方为了满足通用性，接口的设计有其既有的粒度


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