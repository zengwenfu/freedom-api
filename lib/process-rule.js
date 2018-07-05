const {
	SyncHook,
	AsyncSeriesHook
 } = require("tapable");

function excute(data, allData, statement) {
  const caller = new Function('$data$', '$allData$', `return (${statement})`);
  return caller(data, allData);
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
    const match = cookie.match(reg);
    if (match) {
      const kv = match[1].split('=');
      this._cookie[kv[0].trim()] = kv[1].trim();
    }
  }

  dueSetCookie(headers) {
    const setCookies = headers['Set-Cookie'];
    if (setCookies instanceof Array) {
      this._setCookie.concat(setCookies);
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
      temp.push(`key=${this._cookie[key]}`);
    }
    return temp.join(';')
  }

  async start(processes, initCookie = false, callback) {
    this.parseCookie(initCookie);
    // notify start
    this.hooks.start.call();
    for (let i = 0; i < processes.length; i++) {
      const process = processes;
      await this.hooks.beforeProcess.promise(process);
      if (process instanceof Array) {
        const reqs = [];
        for (let j = 0; j < process.length; j++) {
          reqs.push(this.createRequest(process[j]));
        }
        const data = await new Promise.all(reqs);
        const bodys = []
        for (let j = 0; j < data.length; j++) {
          this._allData[process[j].name] = data[j];
          this.dueSetCookie(data[j].headers);
          bodys.push(data[j].body);
        }
        this._preData = bodys;
      } else {
        const data = await this.createRequest(process);
        this._allData[process.name] = data;
        this.dueSetCookie(data.headers);
        this._preData = data.body;
      }
      await this.hooks.afterProcess.promise(this._preData);
    }
    callback({
      allData: this._allData,
      setCookies: this.setCookies
    })
  }

  excuteParams(params) {
    const result = {}
    for (const key in params) {
      result[key] = excute(this._preData, this._allData, params[key]);
    }
    return result;
  }

  async createRequest(options) {
    // notify before request, can due options
    await this.hooks.beforeRequest.promise(options);
    const reqOptions = {
      uri: options.url,
      method: options.method,
      headers: {
        Cookie: this.formatCookie()
      }
    }
    if (options.method === 'POST' && options.json) {
      reqOptions.json = excute(this._preData, this._allData, options.json);
    } else if (options.method === 'POST' && options.params) {
      reqOptions.form = this.excuteParams(options.params);
    }
    const data = await request(options);
    // notify after request, can due result
    await this.hooks.afterRequest.promise(data);
    return data;
  }
}

module.exports = ProcessRule;