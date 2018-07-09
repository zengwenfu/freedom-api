freedom-api
============

freedom-api 是一款基于 node8 实现的接口合并请求模块，可用于实现 [接口代理服务器](https://juejin.im/post/592b705b2f301e0057f25673)。
并且，作者使用本框架实现了一个简单易用的 [在线接口流程测试工具](http://www.facemagic888.com)

## 安装
```
  npm install freedom-api --save-dev
```
## 使用
1. 你需要至少 Node 8.0 以上的环境来运行 freedom-api，因为它使用了 `async` 和 `await` 语法
2. 使用案例：
```js
  const fApi = require('freedom-api');
  // 流程定义
  const processes = {...}
  // 插件定义
  const plugins = []
  fApi({
    processes,
    plugins,
    callback: function(data) {
      /** todo callback **/
    }
  });
```
## 流程定义
### 1) 流程外层规则
流程外层规则是一个 JSON 数组，它定义了接口请求的串行工作流。数组的元素可以包含单独的接口请求配置，也可以是另一个数组，包含多个并行的接口请求配置。例如：
```js
  const processes = [
    {...}, // step1
    {...}, // step2
    [{...}, {...}] // 并行请求的 step3 和 step4
  ]
```
### 2) 接口请求配置
接口请求配置是一个 JSON Obj, 可配置如下属性：
1. url： 接口全路径
2. method： 只支持 POST or GET，默认为 GET
3. name：请求的唯一 key 值，可以用于读取最终的返回数据
4. params：当 method 为 GET， 或者 method 为 POST 且请求 body 使用 x-www-form-urlencoded 编码时，用于设置请求参数。否则，此属性不填或者设置为 false/null/0
5. json：当 method 为 POST 且请求 body 使用 json 编码时，用于设置请求参数，否则，此属性不填或者设置为 false/null/0。目前 POST 请求只支持 x-www-form-urlencoded 和 json 两种格式（符合大多数接口的设计）。
6. assert: 结果断言。可以使用简单的 js 语法对结果进行断言，断言不通过不会执行后续流程。

例如：
```js
const obj = {
  url: 'http://www.facemagic888.com/testFApi/login',
  method: 'POST', 
  name: 'login', 
  json: JSON.stringify({
    name: 'facemagic',
    pass: 'facemagic888'
  }),
  assert: '$data$.code===0'
}
```
### 3) 特殊语法规则
freedom-api 将会根据流程定义完全代理所有接口的请求，所以需要有一些特殊的语法规则来处理流程之间的数据依赖。

**URL 参数和请求参数语法：**

1. $data$: 读取上一个流程的结果数据，如果上一个流程是一个单独的请求流程，则这个变量代表上一个请求的 Response body 对象（如果返回结果为 Json 字符串，将会解析为 Json 对象）；如果上一个流程是一组并行的请求流程，则 $data$ 依次为并行请求数组的 Response body 组成的数组（同样，Json 字符串会被解析），例如：
```js
  
  // 上一个接口为单独请求，返回数据
  // {
  //   data: [{
  //     id: 1
  //   }, {
  //     id: 2
  //   }]
  // }

  // restful url 参数读取上一个流程结果中的数据
  {
    url: `http:/www.facematic888.com/testFApi/getDetail/$data$.data[0].id` // $data$.data[0].id = 1
    ...
  }

  // 请求参数读取上一个流程结果中的数据
  {
    ...
    params: [
      {
        key: 'id',
        value: '$data$.data[1].id' // =2
      }
    ]
  }

  // 上一个流程为并行请求组，返回结果组成数组
  // [
  //   {
  //     data: [{
  //       id: 1
  //     }, {
  //       id: 2
  //     }]
  //   },
  //   {
  //     data: [{
  //       id: 3
  //     }, {
  //       id: 4
  //     }]
  //   }
  // ]
  
  // 请求参数读取上一个流程结果中的数据
  {
    ...
    params: [
      {
        key: 'id',
        value: '$data$[0].data[1].id' // =2
      }
    ]
  }
```
2. $allData$: 该变量可以读取该流程之前所有流程请求的 Response body 和 Respone header, 每个请求的结果以请求配置中的 name 为 key 值。所以不必担心无法读取上上一个请求的数据，也不用担心读取不到headers, 例如：
```js
// 流程定义
const processes = [
    {
      name: 'login',
      ...
    }, // step1
    {
      name: 'list',
      ...
    }, // step2
    [
      {
        name: 'detail1',
        ...
      },
      {
        name: 'detail2',
        ...
      }
    ] 
  ]

// 当执行到 detail2 这个请求的时候，$allData$ 等于:
// ps: 还没有 detail1 的，因为它是一个并行的请求
{
  login: {
    headers: {...},
    body: {...}
  },
  list: {
    headers: {...},
    body: {...}
  }
}

```

**断言语法规则：**

断言永远是针对本请求，所以断言只需要通过 $data$ 读取当前请求的 Response body 进行断言
> 断言中的 $data$ 代表本请求的结果，参数中的 $data$ 代表上一个请求

例如：
```
  $data$.code === 0
```

## 插件开发
freedom-api 集成了 [Tapable](https://github.com/webpack/tapable) 插件机制，暴露了如下 hook：
```js
this.hooks = {
  start: new SyncHook(), // 开始
  beforeRequest: new AsyncSeriesHook(['options']), // 请求接口前，可以对参数进行预处理
  afterRequest: new AsyncSeriesHook(['data', 'options', 'assert']),//请求接口后，可以对结果数据进行处理
  beforeProcess: new AsyncSeriesHook(['process']),// 流程执行前（包括流程组）
  afterProcess: new AsyncSeriesHook(['data']), // 流程执行后（包括流程组）
  afterDueOption: new AsyncSeriesHook(['reqOptions', 'options']) // 请求参数处理之后，请求开始之前，还可以对请求进行相应处理
}
```
插件编写举例：
```js
  function afterDueOptionPlugin(processRule) {
    processRule.hooks.afterDueOption.tapPromise('afterDueOption', (reqOptions, options) => {
      this.client.send(buildMsg(TYPE_BEFORE_REQUEST, {options: reqOptions, index: options.index}));
      return new Promise((resolve) => {
        resolve(reqOptions);
      });
    });
  }
```
其中，processRule 是 freedom-api 在注册插件时注入的 tapable 对象，使用 tapPromise（除了start） 的方式注册插件。 其它的请参考 [Tapable](https://github.com/webpack/tapable) 文档。
> 特别需要注意的事，处理同步 hook "start", 其它的 hook 插件都需要返回一个 promise

## 不需要担心登录态的问题
freedom-api 模拟浏览器的方式，会将请求 Response Header 中的 set-cookie 解析保存，再下一个请求将 cookies 注入到 Request Header 中上传，所以即使基于 session <-> cookie 的方式进行登录校验，也不必担心登录态丢失

倘若登录态的维持不是基于 session <-> cookie，你可以从$allData$ 中读取任一个接口请求的 Response header 和 body 来获得你的登录态 token，以此保证登录态
