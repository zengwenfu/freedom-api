# freedom-api
>通行后端接口合并方案，基于node实现的框架，接口的控制权转移到前端，让接口更自由

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