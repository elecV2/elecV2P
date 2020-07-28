/**
 * feed 通知 example
 */

const x = 8

if (x >= 6) {
  $feed.push('elecV2P rss notification', 'x is bigger than 6')
} else {
  $feed.ifttt('elecV2P ifttt notification', 'x is smaller than 6')
}

console.log(x, '通知完成')