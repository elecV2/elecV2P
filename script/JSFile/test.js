console.log('hello elecV2P, nice to meet you!')
console.log('script name', __name)
console.log('current elecV2P version', __version)

if (typeof __vernum !== 'undefined') {
  if ($env.node_version) {
    console.log('current nodejs version', $env.node_version)
  }
  if (__vernum >= 367) {
    console.log('current script md5 hash', __md5hash)
  }
}
console.log('Project: https://github.com/elecV2/elecV2P')
console.log('Docs: https://github.com/elecV2/elecV2P-dei')

console.log('telegram channel: https://t.me/elecV2')

$done('elecV2P test done')