/**
 * 将 ansi color 转换为 html 进行显示
 * Author: http://t.me/elecV2
 * 待优化：
 *   - ansi 256
 *   - 当前应用色彩状态保存（便于反色
 **/

const colors = [
  // https://en.wikipedia.org/wiki/ANSI_escape_code
  // Windows 10 Console
  "#0c0c0c", "#c50f1f", "#13a10e", "#c19c00", "#0037da", "#881798", "#3a96dd", "#cccccc",
  "#767676", "#e74856", "#16c60c", "#f9f1a5", "#3b78ff", "#b4009e", "#61d6d6", "#f2f2f2",
]

const code_to_style = new Map([
  ["0", ""],
  ["1", "font-weight: bold;"],
  ["2", "opacity:0.5;"],
  ["3", "font-style: italic;"],
  ["4", "text-decoration-line: underline;"],
  ["5", ""],  // blink
  ["7", ""],  // Reverse
  ["8", "display: none;"],
  ["9", "text-decoration-line: line-through;"],

  ["30", `color: ${colors[0]};`], ["90", `color: ${colors[8]};`],
  ["31", `color: ${colors[1]};`], ["91", `color: ${colors[9]};`],
  ["32", `color: ${colors[2]};`], ["92", `color: ${colors[10]};`],
  ["33", `color: ${colors[3]};`], ["93", `color: ${colors[11]};`],
  ["34", `color: ${colors[4]};`], ["94", `color: ${colors[12]};`],
  ["35", `color: ${colors[5]};`], ["95", `color: ${colors[13]};`],
  ["36", `color: ${colors[6]};`], ["96", `color: ${colors[14]};`],
  ["37", `color: ${colors[7]};`], ["97", `color: ${colors[15]};`],

  ["40", `background-color: ${colors[0]};`], ["100", `background-color: ${colors[8]};`],
  ["41", `background-color: ${colors[1]};`], ["101", `background-color: ${colors[9]};`],
  ["42", `background-color: ${colors[2]};`], ["102", `background-color: ${colors[10]};`],
  ["43", `background-color: ${colors[3]};`], ["103", `background-color: ${colors[11]};`],
  ["44", `background-color: ${colors[4]};`], ["104", `background-color: ${colors[12]};`],
  ["45", `background-color: ${colors[5]};`], ["105", `background-color: ${colors[13]};`],
  ["46", `background-color: ${colors[6]};`], ["106", `background-color: ${colors[14]};`],
  ["47", `background-color: ${colors[7]};`], ["107", `background-color: ${colors[15]};`],
])

const code_to_close = new Set(["21", "22", "23", "24", "25", "27", "28", "29", "39", "49"])

function ansiHtml(str) {
  if (!/(?:(?:\u001b\[)|\u009b)(?:(?:[0-9]{1,3})?(?:(?:;[0-9]{0,3})*)?[A-M|f-m])|\u001b[A-M]/.test(str)) {
    return str
  }

  let openTags = 0
  let ret = str.replace(/\033\[([\d;]*)m/g, (m, m1)=>{
    if (m1 === '0') {
      // close all tags
      let ct = ''
      while(openTags > 0) {
        ct += '</span>'
        openTags--
      }
      return ct
    }
    if (code_to_close.has(m1)) {
      if (openTags > 0) {
        openTags--
        return '</span>'
      }
      return ''
    }

    openTags++
    if (code_to_style.has(m1)) {
      return `<span style="${ code_to_style.get(m1) }">`
    }
    return `<span style="${ ansiStyle(m1) }">`
  })

  while (openTags > 0) {
    ret += '</span>'
    openTags--
  }

  return ret
}

function ansiStyle(strcode = '') {
  if (!strcode) {
    return ''
  }
  let codes = strcode.split(';')
  let res = ''
  // 待优化 ansi256 true color 部分
  for (let idx = 0; idx < codes.length; idx++) {
    let code = codes[idx]
    if (code_to_style.has(code)) {
      res += code_to_style.get(code)
      continue
    }
    if (code === '38') {
      // front color
      if (codes[idx+1] === '5' && codes[idx+2]) {
        // ansi256 待优化
        res += `color: ${colors[Math.floor(Number(codes[idx+2])/16)]};`
        idx += 2
      } else if (codes[idx+1] === '2' && codes[idx+2] && codes[idx+3] && codes[idx+4]) {
        res += `color: rgb(${Number(codes[idx+2])}, ${Number(codes[idx+3])}, ${Number(codes[idx+4])});`
        idx += 4
      } else {
        continue
      }
    }
    if (code === '48') {
      // back color
      if (codes[idx+1] === '5' && codes[idx+2]) {
        res += `background-color: ${colors[Math.floor(Number(codes[idx+2])/16)]};`
        idx += 2
      } else if (codes[idx+1] === '2' && codes[idx+2] && codes[idx+3] && codes[idx+4]) {
        res += `background-color: rgb(${Number(codes[idx+2])}, ${Number(codes[idx+3])}, ${Number(codes[idx+4])});`
        idx += 4
      } else {
        continue
      }
    }
  }
  return res
}

module.exports = { ansiHtml }