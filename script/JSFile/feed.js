/**
 * elecV2P feed 通知 example
 * 更多使用说明查看文档: https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md
 */

const x = 8

if (x >= 6) {
  // 基础通知
  $feed.push(`elecV2P ${__version} start`, 'nice to meet yout')
} else if (x > 3) {
  // IFTTT 通知
  $feed.ifttt('elecV2P ifttt notification', x + ' is bigger than 3')
} else if (x > 1) {
  // BARK 通知
  $feed.bark('elecV2P bark notification', 'x value is ' + x)
} else {
  // 自定义通知
  $feed.cust('$enable$自定义通知', '通过 $enable$ 强制发送的通知')
}

console.log(x, '通知完成')