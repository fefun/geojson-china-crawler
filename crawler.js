var fs = require('fs')
var axios = require('axios')
var { getFeatures } = require('./script/parser')

async function getByCode (code) {
  let url = `https://webapi.amap.com/ui/1.0/ui/geo/DistrictExplorer/assets/d_v1/an_${code}.json?v=1.0.11&key=160cab8ad6c50752175d76e61ef92c50`
  return new Promise(function (resolve, reject) {
    axios.get(url).then(res => {
      if (res.data) {
        let json = getFeatures(code, res.data)
        fs.writeFileSync('./' + code + '.geojson', JSON.stringify(json))
        resolve(json)
      }
    })
  })
}

;(async function (params) {
  let geo = await getByCode('100000')
  geo.features.forEach(async function (g) {
    // TODO 
    // let code = g.properties.adcode
    // await getByCode(code)
  })
})()
