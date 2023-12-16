const CONFIG = {
  base_url: location.origin,
  glogslicebegin: 0,
  version: VERSION,
}
CONFIG.vernum = Number(CONFIG.version.replace(/\D/g, ''))

export {
  CONFIG
}