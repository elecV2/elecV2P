const express = require('express')

const CONFIG_exstatic = {}

app.use('/efss', dyn)
app.use('/efss/:favend', favend)

function favend(req, res, next) {
  // body...
  if (CONFIG.efss.favend && CONFIG.efss.favend[key]) {
    return express.static(CONFIG.efss.favend[key].directory)
  }
}

module.exports = (path) => {

}