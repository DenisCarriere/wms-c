const convert = require('xml-js')
const path = require('path')
const fs = require('fs')
const test = require('tape')
const wmsc = require('./')

// Variables
const title = 'Tile Service'
const identifier = 'osm'
const abstract = '© OSM data'
const minzoom = 10
const maxzoom = 18
const url = 'http://localhost:80/WMTS'
const keywords = ['world', 'imagery', 'wms-c']
const format = 'jpg'
const bbox = [-180, -85, 180, 85]
const spaces = 2
const options = {
  title,
  spaces,
  abstract,
  minzoom,
  maxzoom,
  bbox,
  url,
  keywords,
  format,
  identifier
}

/**
 * Jest compare helper
 *
 * @param {ElementCompact} json
 * @param {string} fixture
 */
function compare (t, data, fixture) {
  var fullpath = path.join(__dirname, 'fixtures', fixture)
  let xml = data
  // console.log(JSON.stringify(data, null, 2))
  if (typeof (data) !== 'string') { xml = convert.js2xml(data, {compact: true, spaces}) }
  if (process.env.REGEN) { fs.writeFileSync(fullpath, xml, 'utf-8') }
  t.equal(xml, fs.readFileSync(fullpath, 'utf-8'), fixture)
}

test('wmsc.getCapabilities', t => {
  compare(t, wmsc.getCapabilities(options), 'getCapabilities.xml')
  compare(t, wmsc.Capabilities(options), 'Capabilities.xml')
  compare(t, wmsc.Capability(options), 'Capability.xml')
  compare(t, wmsc.Request(options), 'Request.xml')
  compare(t, wmsc.TileSet(options), 'TileSet.xml')
  compare(t, wmsc.Service(options), 'Service.xml')
  compare(t, wmsc.Keywords(keywords), 'Keywords.xml')
  compare(t, wmsc.Layer(options), 'Layer.xml')
  t.throws(() => wmsc.getCapabilities('invalid'))
  t.end()
})

test('wmsc.utils', t => {
  t.deepEqual(wmsc.clean({foo: 10, bar: undefined}), {foo: 10})
  t.deepEqual(wmsc.clean({foo: undefined, bar: undefined}), {})
  t.deepEqual(wmsc.clean({foo: 0}), {foo: 0})
  t.end()
})
