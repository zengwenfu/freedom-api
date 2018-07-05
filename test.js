const ProcessRule = require('./lib/process-rule');

const processRule = new ProcessRule();

processRule.hooks.start.tap('startPlugin', () => {
  console.log('start plugin');
})

processRule.hooks.beforeRequest.tapPromise('beforeRequest', (options) => {
  console.log('ok');
  options.push(1);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(options);
    }, 1000);
  })
})

processRule.hooks.beforeRequest.tapPromise('beforeRequest1', (options) => {
  console.log('ok2');
  options.push(1);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(options);
    }, 1000);
  })
})

processRule.beforeRequest();