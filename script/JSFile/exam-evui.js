// $evui 简单使用范例

const ui = {
  id: 'wogowjdl',      // 给图形界面一个独一无二的 ID。可省略（以下所有参数都可省略，不再重复说明）
  title: 'elecV2P windows',    // 窗口标题
  width: 800,          // 窗口宽度
  height: 600,         // 窗口高度
  content: `<p>显示一张图片</p><img src='https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/overview.png'>`,       // 图形界面显示内容
  style: "background: #FF8033; font-size: 32px; text-align: center",  // 设置一些基础样式
  resizable: true,     // 窗口是否可以缩放
  draggable: true,     // 窗口是否可以拖动
  cbable: true,        // 是否启用 callback 函数，用于接收前端 UI 提交的数据
  cbdata: 'hello',     // 提供给前端 UI 界面的初始数据
  cblabel: '提交数据', // 提交按钮显示文字
}

$evui(ui, data=>{
  // 此为 callback 函数，用于接收处理前端 UI 返回的数据
  console.log('data from client:', data)
}).then(data=>console.log(data)).catch(e=>console.error(e))

console.log(ui.title, 'is ready')