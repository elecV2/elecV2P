let body = $response.body
let restype = $response.headers['Content-Type']

if (/html/.test(restype)) {
  const $ = $cheerio.load(body)
  if ($('.version').length) {
    $('.version').text('cheerio')
    body = $.html()
    console.log(body)
  }
}

$done(body)