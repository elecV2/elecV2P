// a example for rule

// $request.headers, $request.body, $request.method, $request.hostname, $request.port, $request.path, $request.url
// $response.headers, $response.body, $response.statusCode

let body = $response.body
// let obj = JSON.parse(body)
if (/httpbin/.test($request.url)) {
  body += 'change by elecV2P' + body
}
$done({ body })