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
console.log('彩色风格日志测试（要求 elecV2P >= 3.7.0）\n\x1B[0;30;40m 0;30;40 \x1B[0m\x1B[0;30;41m 0;30;41 \x1B[0m\x1B[0;30;42m 0;30;42 \x1B[0m\x1B[0;30;43m 0;30;43 \x1B[0m\x1B[0;30;44m 0;30;44 \x1B[0m\x1B[0;30;45m 0;30;45 \x1B[0m\x1B[0;30;46m 0;30;46 \x1B[0m\x1B[0;30;47m 0;30;47 \x1B[0m\n\x1B[1;31;40m 1;31;40 \x1B[0m\x1B[1;31;41m 1;31;41 \x1B[0m\x1B[1;31;42m 1;31;42 \x1B[0m\x1B[1;31;43m 1;31;43 \x1B[0m\x1B[1;31;44m 1;31;44 \x1B[0m\x1B[1;31;45m 1;31;45 \x1B[0m\x1B[1;31;46m 1;31;46 \x1B[0m\x1B[1;31;47m 1;31;47 \x1B[0m\n\x1B[2;32;40m 2;32;40 \x1B[0m\x1B[2;32;41m 2;32;41 \x1B[0m\x1B[2;32;42m 2;32;42 \x1B[0m\x1B[2;32;43m 2;32;43 \x1B[0m\x1B[2;32;44m 2;32;44 \x1B[0m\x1B[2;32;45m 2;32;45 \x1B[0m\x1B[2;32;46m 2;32;46 \x1B[0m\x1B[2;32;47m 2;32;47 \x1B[0m\n\x1B[3;33;40m 3;33;40 \x1B[0m\x1B[3;33;41m 3;33;41 \x1B[0m\x1B[3;33;42m 3;33;42 \x1B[0m\x1B[3;33;43m 3;33;43 \x1B[0m\x1B[3;33;44m 3;33;44 \x1B[0m\x1B[3;33;45m 3;33;45 \x1B[0m\x1B[3;33;46m 3;33;46 \x1B[0m\x1B[3;33;47m 3;33;47 \x1B[0m\n\x1B[4;34;40m 4;34;40 \x1B[0m\x1B[4;34;41m 4;34;41 \x1B[0m\x1B[4;34;42m 4;34;42 \x1B[0m\x1B[4;34;43m 4;34;43 \x1B[0m\x1B[4;34;44m 4;34;44 \x1B[0m\x1B[4;34;45m 4;34;45 \x1B[0m\x1B[4;34;46m 4;34;46 \x1B[0m\x1B[4;34;47m 4;34;47 \x1B[0m\n\x1B[5;35;40m 5;35;40 \x1B[0m\x1B[5;35;41m 5;35;41 \x1B[0m\x1B[5;35;42m 5;35;42 \x1B[0m\x1B[5;35;43m 5;35;43 \x1B[0m\x1B[5;35;44m 5;35;44 \x1B[0m\x1B[5;35;45m 5;35;45 \x1B[0m\x1B[5;35;46m 5;35;46 \x1B[0m\x1B[5;35;47m 5;35;47 \x1B[0m\n\x1B[6;36;40m 6;36;40 \x1B[0m\x1B[6;36;41m 6;36;41 \x1B[0m\x1B[6;36;42m 6;36;42 \x1B[0m\x1B[6;36;43m 6;36;43 \x1B[0m\x1B[6;36;44m 6;36;44 \x1B[0m\x1B[6;36;45m 6;36;45 \x1B[0m\x1B[6;36;46m 6;36;46 \x1B[0m\x1B[6;36;47m 6;36;47 \x1B[0m\n\x1B[7;37;40m 7;37;40 \x1B[0m\x1B[7;37;41m 7;37;41 \x1B[0m\x1B[7;37;42m 7;37;42 \x1B[0m\x1B[7;37;43m 7;37;43 \x1B[0m\x1B[7;37;44m 7;37;44 \x1B[0m\x1B[7;37;45m 7;37;45 \x1B[0m\x1B[7;37;46m 7;37;46 \x1B[0m\x1B[7;37;47m 7;37;47 \x1B[0m')
console.log('Project: https://github.com/elecV2/elecV2P')
console.log('Docs: https://github.com/elecV2/elecV2P-dei')

console.log('telegram channel: https://t.me/elecV2')

$done('elecV2P test done')