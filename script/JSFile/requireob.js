// require 有缓存，本文件修改后，可能在其他引用脚本中并不会马上生效

module.exports = data => {
  console.log('data from requireob js', data)
  return 'data from requireob js ' + data
}