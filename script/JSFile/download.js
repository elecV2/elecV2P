// 指定下载目录及文件名
$download('https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/examples/Shell/exam-request.py', './script/Shell/myreq.py').then(d=>console.log(d)).catch(e=>console.error(e))

// 以 object 方式指定下载目录
$download('https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/examples/JSTEST/boxjs.ev.js', {
  folder: './script/JSFile',
  name: 'box.js'
}).then(d=>console.log('文件已下载: ' + d)).catch(e=>console.error(e))