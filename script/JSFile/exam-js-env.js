// test task runjs -e arguments

let name = 'elecV2P'
if (typeof($name) != "undefined") {
  name = $name
}
console.log('hello', name)

if (typeof($cookie) != "undefined") {
  console.log('a cookie from task env', $cookie)
}