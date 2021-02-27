// 功能：下载远程文件到 elecV2P 服务器

// 指定下载目录及文件名
$download('https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/examples/Shell/exam-request.py', './script/Shell/myreq.py').then(d=>console.log(d)).catch(e=>console.error(e))

// 省略第二个参数直接下载。会自动将文件下载到当前 EFSS 目录
$download('https://raw.githubusercontent.com/elecV2/elecV2P/master/efss/tasksub.json').then(d=>console.log(d)).catch(e=>console.error(e))

// 以 object 方式指定下载目录及重命名
$download('https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js', {
  folder: './script/JSFile',     // 指定下载目录
  name: 'update.js'              // 重命名文件
}).then(d=>console.log('文件已下载: ' + d)).catch(e=>console.error(e))