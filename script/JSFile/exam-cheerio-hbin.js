let body = $response.body
let restype = $response.headers['Content-Type']

if (/html/.test(restype)) {
  const $ = $cheerio.load(body)
  if ($('h1').length) {
    $('h1').text('changed by elecV2P')
    body = $.html()
    // console.log(body)
  }
}

$done(body)