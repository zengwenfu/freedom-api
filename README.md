# freedom-api

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