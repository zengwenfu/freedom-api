# freedom-api
>通行后端接口合并方案，基于node实现的框架，接口的控制权转移到前端，让接口更自由。
>在使用上，搭建一个node代理服务，调用freedom-api，实现接口合并的[规则](#rule)
>[接口合并的必要性论述](https://github.com/zengwenfu/note/blob/master/node/freedom-api.md)

<h2 id="nav">目录</h2>
- <a href="#1">一、如何使用</a>
- <a href="#rule">二、规则说明</a>
    + [规则总览](#3.1)
    + [steps中的具体字段](#3.2)
    + [返回值说明](#3.3)
- <a href="#plug">三、插件说明</a>
    + [事件说明](#event)
    + [插件的写法](#how)
    + [插件注入](#bind)
- <a href="#after">四、写在后面的话</a>

<h2 id="1">如何使用</h2>
一、 首先你得有一个node环境，需要写一个基于node的web服务

二、 安装：npm install freedom-api

三、 提供一个web接口，在此接口中调用freedom-api，以express为例，可以这么写
```
var express = require('express');
var router = express.Router();
var freedomApi = require('freedom-api');
var StartProcessPlugin = require('../plugins/startProcessPlugin.js');

router.post('/freedomApi', function(req, res, next) {

    //规则
    var rule = JSON.parse(req.body.rule);
    //透传cookie，以便保持登录状态
    var cookie = req.get('Cookie');

    //调用freedom-api
    freedomApi({
        rule: rule,
        cookie: cookie,
        plugins: [new StartProcessPlugin()],//插件配置
        callback: function(result, setCookie) {
            //写回cookie
            res.append('Set-Cookie', setCookie);
            res.send(JSON.stringify(result));
        }
    });


});

module.exports = router;

```

- freedom-api接收四个参数，分别为rule,cookie,和callback，以及plugins
- rule传入一个json格式对象，具体格式参见下文的<a href="#rule">规则说明</a>
- cookie:freedom-api作为代理服务的接口合并实现，为了维持登录态，需要透传cookie，所以需要在传入参数的时候带入客户端的cookie，并且在回调的时候拿到api-server的set-cookie串，发回客户端去执行setCookie命令。当然，如果客户端是浏览器环境，只要写会`Set-Cookie`就可以了，其它的事情浏览器会帮你做好。如果是andorid/ios环境，想必你已经有了成熟的维持登录态的方案。cookie的获取和set-cookie的写回需要你来进行控制（因为freedom-api不想依赖于express或者koa等web框架），除非你的接口并不需要维护登录状态
- callback:freedom-api处理结束会调用这个回调方法，该方法接收result（处理结果）和setCookie（setCookie的作用前面已经提过）两个参数
- plugins: 插件列表，freedom-api核心使用了tapable的插件机制，插件可以监听freedom-api在各个环节抛出的事件，进行一些面向切面的处理，例如参数校验，加密加签等。[插件机制](#plug)

四、 [点击进入示例工程](https://github.com/zengwenfu/freedom-api-simple)

<h2 id="rule"> 规则说明 </h2>
> 规则采用json字符串参数传输，前端负责构造规则字符串，后端直接对规则字符串进行解析
> 规则借鉴promise的all和then语法，切合前端开发人员的开发习惯

<h3 id="3.1">规则总览</h3>
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
                ...,
                then: 'step2' //指向下一个step
            }
        ],
        'step2': {
            name: 'step2',
            ...
            then: false
        }
    }
```
规则的最外层有如下几个参数：

- dataTest：每个接口返回值的简单校验规则（非必传），例如：接口服务器定义的接口只有返回值为`"0"`才是成功，使用`$data.code === "0"`(其中$data是规则的保留变量，用于获得每个接口的返回值)，当条件不满足的时候，代理服务将会把已经请求成功的接口数据以及错误信息返回，不再进行后续的接口请求
```
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
- errorMsg: 当dataTest条件不满足的时候，取请求返回结果的那个字段作为错误信息（非必传），例如：`errorMsg: "msg"`，表示取resData.msg作为错误提示
- steps/start: 规则最外层的其它key值定义了合并请求的每个步骤，其中start是整个合并请求的入口步骤，其它步骤可以任意命名，每个步骤可以是对象也可以是数组，对象定义了单独的接口请求，数组定义了并行的多个请求（类似于promise.all），数组内部对象不能再嵌套更深层次的step。

<h3 id="3.2"> steps中的具体字段 </h3>

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| url | string | 接口的请求地址 |
| type | string | 请求类型，取值为get或者post |
| params | obj | 请求参数，如果要获取上一个step返回结果的数据作为参数，可以使用`$data`（如果上一步是一个数组，那么使用`$data[i]`来获取对应数组项目的数据）关键字来获取，例如，上一个step返回`{code: '0', msg: '', data:{ id: '1'}}`，那么$data.data.id = '1' |
| name | string | 这个步骤的名称，如果需要将这个步骤的请求结果返回，那么以`name + 'Data'`作为该请求结果的key值，如name为step，且result = true，那么返回结果`{stepData: {...}, ..}` 为了避免数据覆盖，应该要保证每个step都不重名。如果发生了异常，也以name值来标识发生错误的step |
| result | boolean | 这个步骤的请求结果需不需要返回true返回，false不返回 |
| then | string/boolean | 为string的时候指向下一个step，为false的时候，这个step为最后一步。当一个step为数组的时候，step字段加在数组中的最后一项，如果未加在最后一项，那么其后的所有请求将不再执行 |

<h3 id="3.3">返回值说明</h3>
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
2. 如果在某个step处理的过程中发生了错误，那么后续的step将不再执行，返回已经处理过的step(包括发生错误的step),还增加一个error对象，包含msg，和错误发生的step的name标识

<h2 id='plug'>插件说明</h2>
>freedom-api核心采用了tapable插件机制，建议先有所了解[Tapable中文文档](http://www.jianshu.com/p/c71393db6287)

<h3 id='event'>事件说明</h3>
####start-process
```
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
```
在freedom-api拿到规则准备分析的时候抛出，事件参数为规则对象，插件需要返回处理过的规则对象
#### before-request/after-request
```
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
```
分别在接口请求之前和接口请求之后触发，事件参数分别为接口的请求参数和接口的返回结果，插件需要返回处理后的请求参数或者接口返回结果
#### get-data
```
    self.applyPluginsAsyncWaterfall('get-data', data, function(err, resData) {
        ...
    }
```
每个step完成之后触发，事件参数为每个step的请求结果，倘若step不为数组，那么事件效果同after-request，否则事件参数为all请求后的数组结果，插件需要返回处理后的请求结果

<h3 id='how'>插件的写法</h3>
```
    'use strict';

    function StartProcessPlugin() {

    }

    StartProcessPlugin.prototype.apply = function(processRule) {
        processRule.plugin('start-process', function(value, callback) {
            console.log(value);
            //TODO doSomething
            

            if(err) {
                //发生错误
                callback(err, value);
                return;
            }

            //返回结果
            callback(null, value);
            
        });
    }

    module.exports = StartProcessPlugin;
```

- 插件类以原型中的apply方法为入口，apply传入processRule对象，这个对象为规则解析的核心逻辑
- 使用`processRule.plugin('name', function(value, callback)(){})`的方式监听`name`对象，由于processRule使用了applyPluginsAsyncWaterfall的方式来触发事件，所以所有的监听方法会以先入先出的方法串行调用，并且通过`callback(null, value)`的方式传递参数，详情请参考：[Tapable中文文档](http://www.jianshu.com/p/c71393db6287)

<h3 id='bind'>插件注入</h3>
```
    //调用freedom-api
    freedomApi({
        rule: rule,
        cookie: cookie,
        plugins: [new StartProcessPlugin()],//插件配置
        callback: function(result, setCookie) {
            //写回cookie
            res.append('Set-Cookie', setCookie);
            res.send(JSON.stringify(result));
        }
    });
```

- 在调用freedomApi的时候传入plugins对象或对象数组

<h2 id='after'>写在后面的话</h2>
写的这么卖力，给一颗星吧~~

[返回目录](#nav)

![](https://nodei.co/npm/freedom-api.png)
