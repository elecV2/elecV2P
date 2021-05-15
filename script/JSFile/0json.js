// $request.headers, $request.body, $request.method, $request.hostname, $request.port, $request.path, $request.url
// $response.headers, $response.body, $response.statusCode

let body = $response.body
let url = $request.url

let obj = JSON.parse(body)
obj.data = $store.get('cookieKEY') || "1"
body = JSON.stringify(obj)

$done({ body })