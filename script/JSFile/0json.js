var body = $response.body;
var url = $request.url;

let obj = JSON.parse(body);
obj.data = "1";
body = JSON.stringify(obj);

$done({body});