const {
	SyncHook,
	AsyncSeriesHook
 } = require("tapable");

 const request = require('./request');

function excute(data, allData, statement) {
  if (typeof statement !== 'string') {
    statement = JSON.stringify(statement);
  }
  if (statement.indexOf('$data$') < 0 && statement.indexOf('$allData$') < 0) {
    return statement;
  }
  try {
    const caller = new Function('$data$', '$allData$', `return (${statement})`);
    return caller(data, allData);
  } catch (e) {
    console.log(e)
    return statement;
  }
}

class ProcessRule {
  constructor () {
    this.hooks = {
      start: new SyncHook(),
      beforeRequest: new AsyncSeriesHook(['options']),
      afterRequest: new AsyncSeriesHook(['data']),
      beforeProcess: new AsyncSeriesHook(['process']),
      afterProcess: new AsyncSeriesHook(['data'])
    }
    this._allData = {};
    this._preData = '';
    this._cookie = {};
    this._setCookie = [];
  }

  addCookie(cookie) {
    const reg = /([^=;]+=[^=;]*);/
    if(!cookie) return;
    const match = cookie.match(reg);
    if (match) {
      const kv = match[1].split('=');
      this._cookie[kv[0].trim()] = kv[1].trim();
    }
  }

  dueSetCookie(headers) {
    const setCookies = headers['set-cookie'];
    if (!setCookies) return;
    if (setCookies instanceof Array) {
      this._setCookie = this._setCookie.concat(setCookies);
      for(let i=0; i < setCookies.length; i++) {
        this.addCookie(setCookies[i]);
      }
    } else {
      this._setCookie.push(setCookies);
      this.addCookie(setCookies);
    }
  }

  parseCookie(initCookie) {
    if (!initCookie) return;
    const array = initCookie.split(';');
    for(let i = 0; i < array.length; i++) {
      const item = array[i].trim();
      const kv = item.split('=');
      this._cookie[kv[0].trim()] = kv[1].trim();
    }
  }

  formatCookie() {
    const temp = []
    for (const key in this._cookie) {
      temp.push(`${key}=${this._cookie[key]}`);
    }
    return temp.join(';')
  }

  async start({processes, initCookie = false, callback}) {
    this.parseCookie(initCookie);
    // notify start
    this.hooks.start.call();
    for (let i = 0; i < processes.length; i++) {
      const process = processes[i];
      await this.hooks.beforeProcess.promise(process);
      if (process instanceof Array) {
        const reqs = [];
        for (let j = 0; j < process.length; j++) {
          reqs.push(this.createRequest(process[j]));
        }
        const data = await Promise.all(reqs);
        const bodys = []
        for (let j = 0; j < data.length; j++) {
          if (data[j].success === -1) {
            callback({
              success: -1,
              allData: this._allData
            })
            return;
          }
          this._allData[process[j].name] = data[j];
          this.dueSetCookie(data[j].headers);
          bodys.push(data[j].body);
        }
        this._preData = bodys;
      } else {
        const data = await this.createRequest(process);
        if (data.success === -1) {
          callback({
            success: -1,
            allData: this._allData
          })
          return;
        }
        this._allData[process.name] = data;
        this.dueSetCookie(data.headers);
        this._preData = data.body;
      }
      await this.hooks.afterProcess.promise(this._preData);
    }
    callback({
      success: 0,
      allData: this._allData,
      setCookie: this._setCookie
    })
  }

  excuteParams(params) {
    const result = {}
    for (const key in params) {
      result[key] = excute(this._preData, this._allData, params[key]);
    }
    return result;
  }

  excuteUrl(url) {
    if(!url) return;
    const arr = url.split('/');
    const result = []
    for (let i = 0; i < arr.length; i++) {
      let item = excute(this._preData, this._allData, arr[i]);
      result.push(item);
    }
    return result.join('/');
  }

  async createRequest(options) {
    // notify before request, can due options
    await this.hooks.beforeRequest.promise(options);
    options.method = options.method || 'GET';
    const uri = this.excuteUrl(options.url);
    const reqOptions = {
      uri,
      method: options.method,
      headers: {
        Cookie: this.formatCookie()
      }
    }
    if (options.method === 'POST' && options.json) {
      reqOptions.json = excute(this._preData, this._allData, options.json);
      try {
        reqOptions.json = JSON.parse(reqOptions.json);
      } catch (e) {}
    } else if (options.method === 'POST' && options.params) {
      reqOptions.form = this.excuteParams(options.params);
    } else if (options.method === 'GET') {
      reqOptions.qs = this.excuteParams(options.params);
    }
    const data = await request(reqOptions);
    // notify after request, can due result
    await this.hooks.afterRequest.promise(data);
    try {
      data.body = JSON.parse(data.body)
    } catch (e) {}
    return data;
  }
}

module.exports = ProcessRule;