const fs = require('fs')
const path = require('path')

const rule = require('./rule')
const runJSFile = require('./runJSFile')

const jslists = fs.readdirSync(path.join(__dirname, 'JSFile')).sort()

module.exports = { ...rule, ...runJSFile, jslists }