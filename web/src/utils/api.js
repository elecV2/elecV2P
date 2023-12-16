import { ebufDecrypt, strToHex } from './string'

// document/浏览器相关 api
function open(url = '') {
  // 打开 url
  switch (url) {
  case 'reload':
  case '?reload':
  case 'refresh':
    location.reload(true)
    break
  default:
    if (!url) {
      console.debug('no url to open')
    } else if (/^#/.test(url)) {
      location.hash = url;
    } else {
      window.open(url, 'elecV2Ptab', 'noreferrer')
    }
  }
}

function getCursorPos(event, mw = 160, mh = 100) {
  let x = event.pageX, y = event.pageY
  if (event.pageX + mw > document.body.clientWidth) {
    x -= mw
  }
  if (event.pageY + mh > document.body.clientHeight) {
    y -= mh
  }
  return [x, y]
}

const storeCache = new Map()
const sponsors = new Map()
sponsors.set('082bc4ee40bfef100f79579dc780dff7', {
  name: 'elecV2',
  homepage: 'https://github.com/elecV2',
})
sponsors.set('cd2458b5e43827ee9a2009b56f29ffd5', {
  name: 'Public test',
  homepage: 'https://t.me/elecV2',
})
sponsors.set('b9b2e3354b6520261c1b5c375dc2bf74', {
  name: 'Oreomeow',
  homepage: 'https://github.com/Oreomeow'
})
let sponsors_cache = localStorage.getItem('sponsors')
if (sponsors_cache) {
  try {
    let spons = JSON.parse(ebufDecrypt(sponsors_cache, 'elecV2P_sponsors'))
    spons.forEach(spon=>{
      sponsors.set(spon, Object.create(null))
    })
  } catch(e) {
    console.debug('parse localStorage sponsors', e)
  }
}
storeCache.set('sponsors', sponsors)
storeCache.set('bChecked', localStorage.getItem('bcheck') === new Date().getDate().toString())

if (sponsors.has(localStorage.getItem('userid'))) {
  storeCache.set('bSponsor', true)
}
const store = {
  get(key){
    return localStorage.getItem(key)
  },
  set(key, value){
    return localStorage.setItem(key, value)
  },
  hasCache(key){
    return storeCache.has(key)
  },
  getCache(key){
    return storeCache.get(key)
  },
  setCache(key, value){
    return storeCache.set(key, value)
  },
  deleteCache(key){
    return storeCache.delete(key)
  },
}

function scrollBottom(item) {
  let ele = document.querySelector(item)
  if (ele) {
    ele.scrollTop = ele.scrollHeight
  }
}

function scrollView(item) {
  let ele = document.querySelector(item)
  if (ele) {
    ele.scrollIntoView()
  }
}

function focusOn(item) {
  let ele = document.querySelector(item)
  if (ele) {
    ele.focus()
  }
}

function saveAsFile(data, filename = 'elecV2P.json', type = 'application/json'){
  if (/json/.test(type)) {
    data = JSON.stringify(data, null, 2)
  } else {
    data = String(data)
  }
  const blob = new Blob([data], { type })
  let url  = window.URL || window.webkitURL
  let link = url.createObjectURL(blob)
  let a = document.createElement('a')
  a.download = filename
  a.href = link
  a.click()
}

function downloadFile(url, filename = '') {
  fetch(url).then(res => {
    if (!filename) {
      try {
        const header = res.headers.get('Content-Disposition')
        const parts = header.split(';')
        filename = parts[1].split('=')[1]
      } catch(e) {
        console.error('fail to get filename', e)
      }
    }
    return res.blob().then((b) => {
      let a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = filename || url.split('/').pop()
      a.click()
    })
  })
}

function injectJs(code = '', item = '.evscript') {
  if (!code) {
    console.log('some code are expect')
    return
  }
  document.querySelector(item) && document.querySelector(item).remove()
  let domscript = document.createElement('script')
  domscript.setAttribute('type', 'text/javascript')
  domscript.setAttribute('defer', 'defer')
  domscript.className = 'evscript'
  domscript.innerHTML = code
  document.head.appendChild(domscript)
}

function injectCss(style = '', item = '.evtheme') {
  if (!style) {
    console.log('some style contexts are expect')
    return
  }
  document.querySelector(item) && document.querySelector(item).remove()
  let domstyle = document.createElement('style')
  domstyle.className = 'evtheme'
  domstyle.innerHTML = style
  document.head.appendChild(domstyle)
}

function injectMeta(name = '', content = '') {
  if (!name) {
    console.log('a meta name is expect')
    return
  }
  let meta_old = document.querySelector(`meta[name=${name}]`), meta = null
  if (meta_old) {
    meta = meta_old
  } else {
    meta = document.createElement('meta')
    meta.name = name
  }
  meta.content = content
  !meta_old && document.head.appendChild(meta)
}

function isPwa(mode = 'standalone') {
  return matchMedia(`(display-mode: ${mode})`).matches || navigator.standalone || document.referrer.includes('android-app://')
}

function removeItem(selector) {
  document.querySelector(selector) && document.querySelector(selector).remove()
}

function copy(text = ''){
  let cinput = document.querySelector('.copyinput')
  if (!cinput || cinput.nodeName !== 'INPUT') {
    cinput = document.createElement('input')
    cinput.className = 'copyinput'
    cinput.style.position = 'fixed'
    cinput.style.top = '-6px'
    cinput.style.height = '0'
    cinput.style.border = 'none'
    document.body.appendChild(cinput)
  }
  cinput.value = text
  cinput.focus()
  cinput.select()
  document.execCommand('copy')
  cinput.blur()
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}

function getFile({ accept = '*', type = 'text', multiple = false } = {}) {
  let input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  if (multiple) {
    input.multiple = true
  }

  return new Promise((resolve, reject)=>{
    input.onchange = e => {
      let file = e.target.files[0]
      if (!file) {
        reject('请先选择文件')
        return
      }
      console.debug('get file', file.name, file.type, file.size);
      if (type === 'file') {
        resolve(file)
      } else {
        let reader = new FileReader()
        reader.readAsText(file, 'UTF-8')

        reader.onload = readerEvent => {
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            content: readerEvent.target.result
          })
        }
      }
    }
    input.click()
  })
}

function getUA() {
  return navigator.userAgent || 'Mozilla/5.0 (Linux; U; elecV2P; x64) ePhone Super Max Plus++'
}

function getPropVal(val = '') {
  return getComputedStyle(document.querySelector('#app')).getPropertyValue(val).trim()
}

function insertText(txt = ''){
  document.execCommand('insertText', false, txt)
}

const hashLogoCache = new Map();
function hashToLogo(md5str = '', text = '', type = 3) {
  if (!(md5str && text)) {
    hashLogoCache.clear()
    return
  }
  if (md5str.length !== 32) {
    md5str = strToHex(text, 32)
  }
  const logoid = md5str + text + type
  if (hashLogoCache.has(logoid)) {
    return hashLogoCache.get(logoid)
  }
  let urldata = ''
  switch (type) {
  case 4:
    urldata = drawProit(md5str)
    break
  case 3:
    urldata = drawGradient(md5str, text)
    break
  case 2:
    urldata = drawCircle(md5str, text)
    break
  case 1:
  default:
    urldata = drawBlock(md5str, text)
  }
  hashLogoCache.set(logoid, urldata)
  return urldata
}

function drawText(text = '', ctx) {
  if (text) {
    if (text.length > 1) {
      text = text.slice(0, 1)
    }
    text = text.toUpperCase()
  } else {
    return
  }
  ctx.beginPath()
  ctx.lineWidth = 6
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 140px ' + (getPropVal('--font-fm') || 'system-ui,sans-serif')
  ctx.strokeStyle = getPropVal('--main-fc') || '#FFFFFF'
  ctx.strokeText(text, 90, 98)
}

function drawCircle(md5str = '', text = ''){
  const dom = document.createElement('canvas')
  dom.width = 180
  dom.height = 180
  const ctx = dom.getContext('2d')
  md5str += md5str
  let sidx = 0
  for (let j = 0; j < 18; j++) {
    for (let i = 0; i < 18; i++) {
      ctx.beginPath()
      ctx.fillStyle = '#' + md5str.slice(sidx + i, sidx + i + 8)
      ctx.arc(i * 10 + 5, j * 10 + 5, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    sidx++
  }
  if (text) {
    drawText(text, ctx)
  }
  return dom.toDataURL()
}

function drawBlock(md5str = '', text = '') {
  const dom = document.createElement('canvas')
  dom.width = 180
  dom.height = 180
  const ctx = dom.getContext('2d')
  const md5int = md5str.match(/\w{2}/g).map(s=>parseInt(s, 16))
  const point_x = [md5int[0] % 120, md5int[1] % 120]
  const point_y = [md5int[2] % (180 - point_x[0]) + point_x[0], md5int[3] % (180 - point_x[1]) + point_x[1]]
  ctx.fillStyle = `rgba(${md5int[0]}, ${md5int[1]}, ${md5int[2]}, ${md5int[3]/380 + 0.3})`
  ctx.fillRect(0, 0, point_y[0], point_x[1] - 2)
  ctx.fillStyle = `rgba(${md5int[4]}, ${md5int[5]}, ${md5int[6]}, ${md5int[7]/380 + 0.3})`
  ctx.fillRect(point_y[0] + 2, 0, 180 - point_y[0] - 2, point_y[1])
  ctx.fillStyle = `rgba(${md5int[8]}, ${md5int[9]}, ${md5int[10]}, ${md5int[11]/380 + 0.3})`
  ctx.fillRect(point_x[0], point_y[1] + 2, 180 - point_x[0], 180 - point_y[1] - 2)
  ctx.fillStyle = `rgba(${md5int[12]}, ${md5int[13]}, ${md5int[14]}, ${md5int[15]/380 + 0.3})`
  ctx.fillRect(0, point_x[1], point_x[0] - 2, 180 - point_x[1])

  ctx.fillStyle = getPropVal('--main-bk') || `rgba(${md5int[1]}, ${md5int[5]}, ${md5int[9]}, ${md5int[13]/380 + 0.3})`
  ctx.fillRect(point_x[0], point_x[1], point_y[0] - point_x[0], point_y[1] - point_x[1])
  ctx.fillStyle = '#000'
  ctx.fillRect(point_y[0], 0, 2, point_y[1])
  ctx.fillRect(point_x[0], point_y[1], 180 - point_x[0], 2)
  ctx.fillRect(point_x[0] - 2, point_x[1], 2, 180 - point_x[1])
  ctx.fillRect(0, point_x[1] - 2, point_y[0], 2)

  if (text) {
    drawText(text, ctx)
  }
  return dom.toDataURL()
}

function drawGradient(md5str = '', text = '') {
  const dom = document.createElement('canvas')
  dom.width = 180
  dom.height = 180
  const ctx = dom.getContext('2d')
  const md5int = md5str.match(/\w{2}/g).map(s=>parseInt(s, 16))
  const gradient = ctx.createRadialGradient(90, 90, 0, 90, 90, 128)

  gradient.addColorStop(0, `rgba(${md5int[0]}, ${md5int[1]}, ${md5int[2]}, ${md5int[3]/380 + 0.3})`)
  gradient.addColorStop(0.25, `rgba(${md5int[4]}, ${md5int[5]}, ${md5int[6]}, ${md5int[7]/380 + 0.3})`)
  gradient.addColorStop(0.5, `rgba(${md5int[8]}, ${md5int[9]}, ${md5int[10]}, ${md5int[11]/380 + 0.3})`)
  gradient.addColorStop(0.75, `rgba(${md5int[12]}, ${md5int[13]}, ${md5int[14]}, ${md5int[15]/380 + 0.3})`)
  gradient.addColorStop(1, `rgba(${md5int[12]}, ${md5int[13]}, ${md5int[14]}, ${md5int[15]/380 + 0.3})`)

  ctx.beginPath()
  ctx.fillStyle = gradient
  ctx.arc(90, 90, 128, 0, Math.PI * 2)
  ctx.fill()

  if (text) {
    drawText(text, ctx)
  }
  return dom.toDataURL()
}

function drawProit(md5str = ''){
  const dom = document.createElement('canvas')
  dom.width = 180
  dom.height = 180
  const ctx = dom.getContext('2d')
  const md5int = md5str.match(/\w{2}/g).map(s=>parseInt(s, 16))
  // 底色
  ctx.fillStyle = `rgba(${md5int[0]}, ${md5int[4]}, ${md5int[8]}, ${md5int[12]/380 + 0.3})`
  ctx.fillRect(0, 0, dom.width, dom.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // 左眼睛
  const l_type  = md5int[0] % 4
  const l_width = md5int[1] % 10 + 10
  ctx.beginPath()
  ctx.lineWidth = md5int[2] % 15 + 5
  ctx.strokeStyle = `rgba(${md5int[0]}, ${md5int[1]}, ${md5int[2]}, ${md5int[3]/380 + 0.3})`
  ctx.fillStyle = `rgba(${md5int[0]}, ${md5int[1]}, ${md5int[2]}, ${md5int[3]/380 + 0.3})`
  switch (l_type) {
  case 0:
    ctx.strokeRect(50 - l_width, 60 - l_width, l_width * 2, l_width * 2)
    break
  case 1:
    ctx.fillRect(50 - l_width, 60 - l_width, l_width * 2, l_width * 2)
    break
  case 2:
    ctx.arc(50, 60, l_width, 0, Math.PI * 2)
    ctx.stroke()
    break
  case 3:
  default:
    ctx.arc(50, 60, l_width, 0, Math.PI * 2)
    ctx.fill()
  }
  // 右眼睛
  const r_type  = md5int[4] % 4
  const r_width = md5int[5] % 10 + 10
  ctx.beginPath()
  ctx.lineWidth = md5int[6] % 15 + 5
  ctx.strokeStyle = `rgba(${md5int[4]}, ${md5int[5]}, ${md5int[6]}, ${md5int[7]/380 + 0.3})`
  ctx.fillStyle = `rgba(${md5int[4]}, ${md5int[5]}, ${md5int[6]}, ${md5int[7]/380 + 0.3})`
  switch (r_type) {
  case 0:
    ctx.strokeRect(130 - r_width, 60 - r_width, r_width * 2, r_width * 2)
    break
  case 1:
    ctx.fillRect(130 - r_width, 60 - r_width, r_width * 2, r_width * 2)
    break
  case 2:
    ctx.arc(130, 60, r_width, 0, Math.PI * 2)
    ctx.stroke()
    break
  case 3:
  default:
    ctx.arc(130, 60, r_width, 0, Math.PI * 2)
    ctx.fill()
  }
  // 鼻子
  ctx.beginPath()
  ctx.moveTo(90, (l_width + r_width) / 2 + 60)
  ctx.quadraticCurveTo(md5int[8], md5int[9], 90, md5int[10] % 15 + 105)
  ctx.lineWidth = md5int[11] % 15 + 5
  ctx.strokeStyle = `rgba(${md5int[8]}, ${md5int[9]}, ${md5int[10]}, ${md5int[11]/380 + 0.3})`
  ctx.stroke()
  // 嘴巴
  ctx.beginPath()
  ctx.moveTo(50, 130)
  ctx.quadraticCurveTo(md5int[12], md5int[13] % 50 + 130, 130, 130)
  ctx.lineWidth = md5int[14] % 15 + 5
  ctx.strokeStyle = `rgba(${md5int[12]}, ${md5int[13]}, ${md5int[14]}, ${md5int[15]/380 + 0.3})`
  ctx.stroke()

  return dom.toDataURL()
}

function evalRun(code = '') {
  if (typeof eval !== 'function') {
    const msg = 'eval 函数在当前环境下不可用'
    console.error(msg)
    return msg
  }
  try {
    const meval = eval
    return meval(code)
  } catch(e) {
    console.error('evalRun fail', e)
    return e.message
  }
}

function getTitle(){
  return document.title
}

function setTitle(title = 'elecV2P'){
  document.title = title
}

function wsOffline({ele = document.querySelector('.logo_a'), off = true}={}) {
  return off ? ele.classList.add('logo_a--offline') : ele.classList.remove('logo_a--offline')
}

function qs(s, a = '') {
  return a ? document.querySelectorAll(s) : document.querySelector(s);
}

const vue2Proto = {
  message: Object.create(null),
  evui: ()=>{},
}

export { open, getCursorPos, store, scrollBottom, scrollView, focusOn, saveAsFile, downloadFile, injectJs, injectCss, injectMeta, isPwa, removeItem, copy, copyToClipboard, getFile, getUA, insertText, vue2Proto, hashToLogo, evalRun, getTitle, setTitle, wsOffline, qs }