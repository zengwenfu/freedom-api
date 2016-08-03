# freedom-api
>通行后端接口合并方案，基于node实现的框架，接口的控制权转移到前端，让接口更自由

## web开发的困境
![](https://github.com/zengwenfu/note/blob/master/images/server-api.png)![](https://github.com/zengwenfu/note/blob/master/images/server-api-all.png)
>在web开发中，前端为了一个实现一个功能，连续的请求多个接口的场景并不少见。图一示例中，后一个接口依赖于前一个接口的请求结果，于是你经常要这样去组织你的接口请求step1.then(step2).then(step3)（不出现层层嵌套已经不错了），图二中，step1,step2,step3虽然没有依赖关系，但是同样需要跟api-server交互三次，对于用户来说，这将是无尽的等待。

>你可能会抱怨后端的同事，为何不把这几个接口合并，然而后端的同事就会反驳你，你这个页面需要step1->step2->step3，那个页面只需要step1 -> step2，甚至有些页面只需要step1，我如何给你合并？确实，接口提供方为了满足通用性，接口的设计有其既有的粒度。

>如果有那么一个后台服务，跟部署在同一个机房（甚至是同一台服务器上），然后给前端提供一套规则，前端只需要把想要的steps按照约定告诉这个后台服务，后台服务去执行step1.then(step2).then(step3)。虽然后台服务跟api-server也交互了三次，但是这个后台服务可以跟api-server部署在同一个网段、同一个服务器甚至还可以集群，不是一个移动设备去访问的速度所能比拟的，更别说很多时候我们的前端的网络环境还是3g/4g

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
3. 提供一个web接口，在此接口中调用freedom-api，以express为例，可以这么写
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
     * options {}
     *  rule: 规则
     *  cookie: 客户端的cookie
     *  callback: 回调函数，接收请求结果reuslt和服务端的setCookie串 
     */
    freedomApi({
        rule: rule,
        cookie: cookie,
        callback: function() {
            //写回cookie
            res.append('Set-Cookie', setCookie);
            //写回结果
            res.send(JSON.stringify(result));
        }
    })
});

module.exports = router;

```
> freedom-api接收三个参数，分别为rule,cookie,和callback
> rule传入一个json格式对象，具体规则下文会**详细描述**
> cookie:值得一提的是，为了维持登录态，freedom-api需要透传cookie，所以需要在传入参数的时候带入客户端的cookie，并且在回调的时候拿到api-server的set-cookie串，发回客户端去setCookie。当然，如果客户端不是浏览器环境，是android和ios，需要另行处理，不过想必你已经有了成熟的方案。cookie的获取和set-cookie的写回需要你来进行控制（因为freedom-api不想依赖于express或者koa等web框架），除非你的接口并不需要维护登录状态
4. [点击进入示例工程](https://github.com/zengwenfu/freedom-api-simple)

## 规则说明
> 传入服务器的rule需要是json结构的字符串
### dataTest和errorMsg字段
```
    var rule = {
        dataTest: '$data.code === "0"',
        errorMsg: 'msg',
        start: {
            name: 'start'
            .....
        },
        step1: {
            name: 'step1'
            ....
        },
        step2: {
            ....
        }
    }
```

1. rule可以传入一个dataTest字段，用于接口返回数据的一般性校验。
2. dataTest字段传入一个js中的条件判断语句字符串（freedom-api服务器要做好防xxl注入的校验），如上例中的$data.code === "0"（$data表示接口的返回，下文还有描述）。
3. 如果传入了freedom-api会对每一个step(每个接口请求)进行校验，如果接口没有通过校验，将不会再往下执行，返回已经完成的step数据以及error。如上例中，若step1返回{code: '1', msg: 'error'}，那么请求将返回
    ```
    {
        startData: {
            ...
        },
        step1Data: {
            code: '1',
            msg: 'error'
        },
        error: {
            errorStep: 'step1',
            msg: 'error'
        }
    }
    ```
4. errorMsg字段是当dataTest校验不通过的时候需要从data中提取哪个字段来作为error中的msg，**注意，这里不需要$data作为前缀**

### start和其它step字段
1. start作为规则中所有步骤的开始步骤，若其then指针不为false，then将指向start完成之后需要执行的步骤
2. 其它步骤字段可以随意命名，其名称将作为每个步骤的then指针的寻址key
 ```
    var rule = {
        start: {
            ...
            then: 'step1'
        },
        step1: {
            ...
            then: 'step2'
        },
        setp2: {
            ...
            then: false
        }
    }
 ```
3. steps还可以是数组（以all的方式并行执行），数组中的最后一项增加指向下一步的指针。为了避免嵌套层次太深： 数组可以包含对象，但是对象里面不能再包含数组，数组中的对象不能再包含对象
 ```
    //正确的规则
    var rule = {
        start: {
            ...
            then: 'step1'//下一步指针
        },
        'step1': [
            {
                name: 'step1-1',
                ...
            },
            {
                name: 'step1-2',
                ...
            },
            {
                next: 'step2'//作为下一步的指针
            }
        ],
        'step2': {
            name: 'step2',
            ...
            then: false
        }
    }

    //错误的规则1
    var rule = {
        start: {
            ...
            then: 'step1'
        },
        'step1': {
            step11: [//嵌套太深 XXX
                ...
            ]
        }
    }
    //错误的规则2
    var rule = {
        start: {
            ...
            then: 'step1'
        },
        'step1': [
            {
                step11: {//嵌套太深 XXX
                    ...
                }
            }
        ]
    }
 ```

### steps中的字段
| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| url | string | 接口的请求地址 |
| type | string | 请求类型，取值为get或者post |
| params | obj | 请求参数，如果要获取上一个step返回结果的数据作为参数，可以使用`$data`（如果上一步是一个数组，那么使用`$data[i]`来获取对应数组项目的数据）关键字来获取，例如，上一个step返回`{code: '0', msg: '', data:{ id: '1'}}`，那么$data.data.id = '1' |
| name | string | 这个步骤的名称，如果需要将这个步骤的请求结果返回，那么以`name + 'Data'`作为该请求结果的key值，如name为step，且result = true，那么返回结果`{stepData: {...}, ..}` 为了避免数据覆盖，应该要保证每个step都不重名。如果发生了异常，也以name值来标识发生错误的step |
| result | boolean | 这个步骤的请求结果需不需要返回true返回，false不返回 |
| then | string/boolean | 为string的时候指向下一个step，为false的时候，这个step为最后一步。当一个step为数组的时候，step字段加在数组中的最后一项，如果未加在最后一项，那么其后的所有请求将不再执行 |

### rule示例 
```
    var host = 'host';
    //simple rule
    var simpleRule = {
        dataTest: '$data.code === "0"',
        errorMsg: 'msg',
        start: {
            url: 'http://' + host + ':3000/getId',
            type: 'get',
            name: 'id',
            params: {},
            result: true,
            then: 'getInfo'
        },
        getInfo: {
            url: 'http://' + host + ':3000/getInfo',
            type: 'get',
            name: 'info',
            params: {
                id: '$data.data.id'
            },
            result: true,
            then: false
        }
    };

    //mutiRule
    var mutiRule = {
        dataTest: '$data.code === "0"',
        errorMsg: 'msg',
        start: [{
            url: 'http://' + host + ':3000/getId',
            type: 'get',
            name: 'id',
            params: {},
            result: true
        }, {
            url: 'http://' + host + ':3000/getName',
            type: 'get',
            name: 'name',
            params: {},
            result: true,
            then: 'getInfoByNameAndId'
        }],
        getInfoByNameAndId: {
            url: 'http://' + host + ':3000/getInfoByNameAndId',
            type: 'get',
            name: 'info',
            params: {
                id: '$data[0].data.id',
                name: '$data[1].data.name'
            },
            result: true,
            then: false
        }
    };

    //long long rule
    var rule = {
        dataTest: '$data.code === "0"',
        errorMsg: 'msg',
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



## 返回值说明
```
    //所有step执行正常1
    {
        "idData": {
            "code": "0",
            "msg": "",
            "data": {
                "id": "1"
            }
        },
        "infoData": {
            "code": "0",
            "msg": "",
            "data": {
                "info": "恭喜你，拿到了数据"
            }
        }
    }

    //step发生了错误
    {
        "idData": {
            "code": "0",
            "msg": "",
            "data": {
                "id": "1"
            }
        },
        "infoData": {
            "code": "2",
            "msg": "数据不存在"
        },
        "error": {
            "msg": "Error: 数据不存在",
            "step": "info"
        }
    }

```

1. 对于每个step，如果result=true，那么它的请求结果将以其name+'Data'为key值返回
2. 如果在某个step处理的过程中发生了错误，那么将不往下继续执行，放回结果处理已经处理过的step(包括发生错误的step),还增加一个error对象，包含msg，和错误发生的step的name标识
