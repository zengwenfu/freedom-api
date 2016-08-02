# freedom-api
>通行后端接口合并方案，基于node实现的框架，接口的控制权转移到前端，让接口更自由

## web开发的困境
![](https://github.com/zengwenfu/note/blob/master/images/server-api.png)![](https://github.com/zengwenfu/note/blob/master/images/server-api-all.png)
>在web开发中，前端为了一个实现一个功能，连续的请求多个接口的场景并不少见。图一示例中，后一个接口依赖于前一个接口的请求结果，于是你经常要这样去组织你的接口请求step1.then(step2).then(step3) 或者（不出现层层嵌套已经不错了），图二中，step1,step2,step3虽然没有依赖关系，但是同样需要跟api-server交互三次，对于用户来说，这将是无尽的等待。

>你可能会抱怨后端的同事，为何不把这几个接口合并，然而后端的同事就会反驳你，你这个页面需要step1->step2->step3，那个页面只需要step1 -> step2，甚至有些页面只需要step1，我如何给你合并？确实，接口提供方为了满足通用性，接口的设计有其既有的粒度。

>如果有那么一个后台服务，跟部署在同一个机房（甚至是同一台服务器上），然后给前端提供一套规则，前端只需要把想要的steps按照约定告诉这个后台服务，后台服务去把step1.then(step2).then(step3)给办了。什么？后台服务跟api-server不也交互了三次么？要知道这个后台服务可以跟api-server部署在同一个网段、同一个服务器甚至还可以集群，不是一个移动设备去访问的速度所能比拟的，更别说很多时候我们的网络环境中没有wifi

>freedom-api就实现了这样一套规则

![](https://github.com/zengwenfu/note/blob/master/images/freedom-api.png)

## 特点
1. 易用
> 除了需要运行在node环境下，freedom-api并不要求更多
2. 控制反转（借用一下spring的词汇）
> freedom-api已经把规则制定好了，需要怎么去组合接口，由前端说了算
3. 规则简单，完全可以按照promise的then和all来理解（实现上也是promise）
4. 通行
> freedom-api并不关心api-server用的是什么语言，对api-server没有嵌入也没有依赖，不需要api-server对已有的api-server做任何改造，只要求接口协议是http/https，数据的传输格式是json（这个应该不算是什么要求）。对于调用方，只要把按约定把规则参数传入就好。

## 如何使用
1. 首先你得有一个node环境，需要写一个基于node的web服务
2. 安装：npm install freedom-api
3. 提供一个web接口，在此接口中调用freedom-api，已express为例，可以这么写
```
var express = require('express');
var router = express.Router();
/**
 * 引入freedom-api库
 */
var freedomApi = require('freedom-api');
/**
 * 提供一个接口
 */
router.post('/freedomApi', function(req, res, next) {
    // 从请求参数中获取规则
    var rule = JSON.parse(req.body.rule);
    //透传cookie，以便保持登录状态
    var cookie = req.get('Cookie');
    /**
     * freedom接受三个参数
     * rule: 规则
     * cookie: 客户端的cookie
     * callback: 回调函数，接收请求结果reuslt和服务端的setCookie串 
     */
    freedomApi(rule, cookie, function(result, setCookie) {
        //写回cookie
        res.append('Set-Cookie', setCookie);
        //写回结果
        res.send(JSON.stringify(result));
    });
});

module.exports = router;

```
> freedom-api接收三个参数，分别为rule,cookie,和callback
> rule传入一个json格式对象，具体规则下文会详细描述
> cookie是客户端
> 代码中已有注释，不需要过多解释，值得一提的是，为了维持登录态，freedom-api需要透传cookie，所以需要在传入参数的时候带入客户端的cookie，并且在回调的时候拿到api-server的set-cookie串，发回客户端去setCookie。当然，如果客户端不是浏览器环境，是android和ios，需要另行处理，不过想必你已经有了成熟的方案
4. [点击进入示例工程](https://github.com/zengwenfu/freedom-api-simple)
> 如果你只是需要使用freedom-api来合并接口，没有别的需求，那么你甚至可以直接部署示例工程中的freedom-api-server




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