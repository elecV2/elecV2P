/**
 * feed 通知 example
 */

const x = 8

if (x >= 6) {
  $feed.push('elecV2P start',  'nice to meet yout')
} else if (x > 1) {
  $feed.ifttt('elecV2P ifttt notification', x + ' is bigger than 1')
} else {
  $feed.bark('elecV2P bark notification', 'x value is ' + x)
}

console.log(x, '通知完成')