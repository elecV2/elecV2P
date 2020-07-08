const fs = require('fs')
const path = require('path')

const { CONFIG_RULE } = require('./rule')
const { runJSFile, CONFIG_RUNJS } = require('./runJSFile')

const JSLISTS = fs.readdirSync(path.join(__dirname, 'JSFile')).sort()

module.exports = { CONFIG_RULE, runJSFile, CONFIG_RUNJS, JSLISTS }