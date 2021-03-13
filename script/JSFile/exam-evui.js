// $evui 简单使用范例

const ui = {
  title: 'elecV2P windows',    // 窗口标题
  width: 800,          // 窗口宽度
  height: 600,         // 窗口高度
  content: `<p>显示一张图片</p><img src='https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/overview.png'>`,       // 图形界面显示内容
  style: {             // 设置一些基础样式
    title: "background: #6B8E23;",   // 设置标题样式
    content: "background: #FF8033; font-size: 32px; text-align: center",  // 设置中间主体内容样式
    cbdata: "height: 220px;",        // 设置返回数据输入框样式
    cbbtn: "width: 220px;"           // 设置提交数据按钮的样式
  },
  resizable: true,     // 窗口是否可以缩放
  draggable: true,     // 窗口是否可以拖动
  cbable: true,        // 是否启用 callback 函数，用于接收前端 UI 提交的数据
  cbdata: 'hello',     // 提供给前端 UI 界面的初始数据
  cblabel: '提交数据', // 提交按钮显示文字
  script: `console.log('hello $evui');alert('hi, elecV2P')`,     // v3.2.4 增加支持在前端网页中插入 javascript 代码
}

$evui(ui, data=>{
  // 此为 callback 函数，用于接收处理前端 UI 返回的数据
  console.log('data from client:', data)
}).then(data=>console.log(data)).catch(e=>console.error(e))

console.log(ui.title, 'is ready')