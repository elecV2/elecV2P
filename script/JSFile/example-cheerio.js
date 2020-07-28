// a simply $cheerio eaxmple. modify from cheerio readme.md

const $ = $cheerio.load(`<ul id="fruits">
  <li class="apple">Apple</li>
  <li class="orange">Orange</li>
  <li class="pear">Pear</li>
</ul>`);

const apple = $('.apple', '#fruits').text()
console.log(apple)

const attr = $('ul .pear').attr('class');
console.log(attr)

const html = $('#fruits').html();
console.log(html)

$done($('.pear').text())