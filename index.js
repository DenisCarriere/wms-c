const convert = require('xml-js')
const mercator = require('global-mercator')

// Default Values
// const MINZOOM = 0
// const MAXZOOM = 20
const SPACES = 2
const BBOX = [-180.0, -85.0511287798, 180.0, 85.0511287798]
const BBOX_METERS = [-20037508.3428, -20037508.3428, 20037508.3428, 20037508.3428]

/**
 * Get Capabilities
 *
 * @param {Options} options Options
 * @param {string} options.url URL of WMTS service
 * @param {string} options.title Title of service
 * @param {string} options.format Format 'png' | 'jpeg' | 'jpg'
 * @param {number} [options.minzoom=0] Minimum zoom level
 * @param {number} [options.maxzoom=22] Maximum zoom level
 * @param {string} [options.accessConstraints] Access Constraints
 * @param {string} [options.fees] Fees
 * @param {string} [options.abstract] Abstract
 * @param {string} [options.identifier] Identifier
 * @param {string[]} [options.keywords] Keywords
 * @param {BBox} [options.bbox] BBox [west, south, east, north]
 * @param {number} [options.spaces=2] Spaces created for XML output
 * @returns {string} XML string
 * @example
 * const xml = wmsc.getCapabilities({
 *   url: 'http://localhost:5000/WMTS',
 *   title: 'Tile Service XYZ',
 *   identifier: 'service-123',
 *   abstract: '© OSM data',
 *   keyword: ['world', 'imagery', 'wmts'],
 *   format: 'png',
 *   minzoom: 10,
 *   maxzoom: 18,
 *   bbox: [-180, -85, 180, 85]
 * })
 */
function getCapabilities (options) {
  options = options || {}
  const spaces = options.spaces || SPACES
  const json = {
    _declaration: {_attributes: { version: '1.0', encoding: 'utf-8' }},
    WMT_MS_Capabilities: Capabilities(options).WMT_MS_Capabilities
  }
  const xml = convert.js2xml(json, { compact: true, spaces: spaces })
  return xml
}

/**
 * Service Exeception
 *
 * @param {string} message
 * @param {Object} options
 * @param {number} options.spaces
 * @return {string} xml
 */
function exception (message, options) {
  message = message || 'foo'
  options = options || {}
  const spaces = options.spaces || SPACES
  const json = {
    _declaration: {_attributes: { version: '1.0', encoding: 'utf-8' }},
    ServiceExceptionReport: {
      _attributes: {version: '1.1.1'},
      ServiceException: {
        _text: message
      }
    }
  }
  const xml = convert.js2xml(json, { compact: true, spaces: spaces })
  return xml
}

/**
 * Capabilities JSON scheme
 *
 * @private
 * @param {Options} options Options
 * @param {string} options.url URL of WMTS service
 * @returns {ElementCompact} JSON scheme
 * @example
 * Capabilities({
 *   url: 'http://localhost:5000'
 * })
 */
function Capabilities (options) {
  options = options || {}

  // Required options
  const url = normalize(options.url)
  if (!url) throw new Error('<url> is required')

  return {
    WMT_MS_Capabilities: Object.assign({
      _attributes: {
        version: '1.1.0'
      }
    },
      Service(options),
      Capability(options)
    )
  }
}

/**
 * Service JSON scheme
 *
 * @private
 * @param {Options} options Options
 * @param {string} options.title Title
 * @param {string} options.url URL
 * @param {string} options.format Format 'png' | 'jpeg' | 'jpg'
 * @param {string} [options.abstract] Abstract
 * @param {string} [options.identifier] Identifier
 * @param {BBox} [options.bbox=[-180, -85, 180, 85]] BBox [west, south, east, north]
 * @returns {ElementCompact} JSON scheme
 * @example
 * Service({
 *   title: 'Service name',
 *   abstract: 'A long description of this service',
 *   keywords: ['world', 'wmts', 'imagery']
 * })
 */
function Service (options) {
  options = options || {}

  // Required options
  const title = options.title
  const url = options.url
  if (!title) throw new Error('options.title is required')
  if (!url) throw new Error('options.url is required')

  // Optional options
  const abstract = options.abstract
  const accessConstraints = options.accessConstraints || 'none'
  const fees = options.fees || 'none'
  const keywords = options.keywords

  return clean({
    'Service': {
      'Name': {_text: 'OGC:WMS'},
      'Title': {_text: title},
      'Abstract': {_text: abstract},
      'KeywordList': (keywords) ? Keywords(keywords)['KeywordList'] : undefined,
      'OnlineResource': { _attributes: {
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        'xlink:type': 'simple',
        'xlink:href': url
      }},
      // ContactAddress: ContactAddress(options).ContactAddress,
      'Fees': {_text: fees},
      'AccessConstraints': {_text: accessConstraints}
    }
  })
}

/**
 * Keywords JSON scheme
 *
 * @private
 * @param {string[]} [keywords]
 * @returns {ElementCompact} JSON scheme
 * @example
 * Keywords(['world', 'imagery', 'wmts'])
 */
function Keywords (keywords) {
  keywords = keywords || []
  return {
    'KeywordList': {
      'Keyword': keywords.map(function (keyword) { return {_text: String(keyword)} })
    }
  }
}

/**
 * Capabilities.Capability JSON scheme
 *
 * @private
 * @param {Options} options Options
 * @returns {Element}
 * @example
 * Capability()
 * //= Capability > [Request, Exception, VendorSpecificCapabilities, UserDefinedSymbolization, Layer]
 */
function Capability (options) {
  options = options || {}

  return {
    Capability: {
      Request: Request(options).Request,
      Exception: {
        Format: [
          {_text: 'application/vnd.ogc.se_xml'},
          {_text: 'application/vnd.ogc.se_inimage'},
          {_text: 'application/vnd.ogc.se_blank'}
        ]
      },
      VendorSpecificCapabilities: TileSet(options),
      Layer: Layer(options).Layer
    }
  }
}

/**
 * TileSet JSON scheme
 *
 * @private
 * @param {number} options.minzoom
 * @param {number} options.maxzoom
 * @param {string} options.format
 * @param {string} options.identifier
 * @param {[number, number, number, number]} options.bbox [west, south, east, north]
 * @returns {ElementCompact} JSON scheme
 */
function TileSet (options) {
  options = options || {}
  if (!options.format) throw new Error('options.format is required')
  if (options.identifier === undefined) throw new Error('options.identifier is required')
  if (options.minzoom === undefined) throw new Error('options.minzoom is required')
  if (options.maxzoom === undefined) throw new Error('options.maxzoom is required')

  /** WARNING: Removed user input BBOX */
  // const bboxMeters = mercator.bboxToMeters(options.bbox) || BBOX_METERS
  const format = (options.format === 'jpg') ? 'jpeg' : options.format

  return {
    TileSet: {
      SRS: {_text: 'EPSG:3857'},
      BoundingBox: BoundingBox(BBOX_METERS, 'EPSG:3857'),
      Resolutions: { _text: resolutions(options.minzoom, options.maxzoom).join(' ') },
      Width: {_text: '256'},
      Height: {_text: '256'},
      Format: {_text: 'image/' + format},
      Layers: {_text: options.identifier}
    }
  }
}

/**
 * Resolutions - Zoom Scales
 *
 * @private
 * @param {number} minzoom
 * @param {number} maxzoom
 * @returns {Array<number>}
 */
function resolutions (minzoom, maxzoom) {
  return range(minzoom, maxzoom + 1).map(function (zoom) {
    return mercator.resolution(zoom)
  })
}

/**
 * Request JSON scheme
 *
 * @private
 * @param {string} options.url
 * @param {string} options.format
 * @returns {ElementCompact} JSON scheme
 */
function Request (options) {
  if (!options.url) throw new Error('options.url is required')
  if (!options.format) throw new Error('options.format is required')

  const url = options.url
  const format = (options.format === 'jpg') ? 'jpeg' : options.format

  return {
    Request: {
      GetCapabilities: {
        Format: {_text: 'application/vnd.ogc.wms_xml'},
        DCPType: DCPType(url)
      },
      GetMap: {
        Format: {_text: 'image/' + format},
        DCPType: DCPType(url)
      },
      /** WARNING: Might need to remove GetFeatureInfo */
      GetFeatureInfo: {
        Format: [
          {_text: 'application/vnd.ogc.gml'},
          {_text: 'text/plain'},
          {_text: 'text/html'}
        ],
        DCPType: DCPType(url)
      }
    }
  }
}

/**
 * DCPType JSON scheme
 *
 * @private
 * @param {string} url
 * @returns {ElementCompact} JSON scheme
 */
function DCPType (url) {
  if (!url) throw new Error('url is required')
  return {
    HTTP: {
      Get: {
        OnlineResource: {
          _attributes: {
            'xmlns:xlink': 'http://www.w3.org/1999/xlink',
            'xlink:type': 'simple',
            'xlink:href': url
          }
        }
      }
    }
  }
}

/**
 * Capabilities.Contents.Layer JSON scheme
 *
 * @private
 * @param {Options} options
 * @param {string} options.title
 * @param {string} options.url
 * @param {string} options.identifier
 * @param {BBox} [options.bbox] (west, south, east, north)
 * @returns {ElementCompact} JSON scheme
 * @example
 * Layer({
 *   title: 'Tile Service'
 *   url: 'http://localhost:5000/wmts'
 *   format: 'jpg'
 * })
 */
function Layer (options) {
  options = options || {}
  if (options.identifier === undefined) throw new Error('identifier is required')
  if (options.title === undefined) throw new Error('title is required')
  if (options.url === undefined) throw new Error('url is required')

  /** WARNING: removed user input BBox */
  // const bbox = options.bbox || BBOX
  // const bboxMeters = mercator.bboxToMeters(bbox) || BBOX_METERS

  const BoundingBoxes = [
    BoundingBox(BBOX_METERS, 'EPSG:900913'),
    BoundingBox(BBOX, 'EPSG:4326'),
    BoundingBox(BBOX_METERS, 'EPSG:3857')
  ]

  return {
    Layer: {
      Title: {_text: options.title},
      /** WARNING: might need to drop WGS84 */
      SRS: [
        {_text: 'EPSG:900913'},
        {_text: 'EPSG:4326'},
        {_text: 'CRS:84'},
        {_text: 'EPSG:3857'}
      ],
      LatLonBoundingBox: BoundingBox(BBOX),
      BoundingBox: BoundingBoxes,
      // Sub-Layer
      Layer: {
        Name: {_text: options.identifier},
        Title: {_text: options.title},
        LatLonBoundingBox: BoundingBox(BBOX),
        BoundingBox: BoundingBoxes
      }
    }
  }
}

/**
 * BBox JSON scheme
 *
 * @private
 * @param {number[]} bbox
 * @param {string} [srs]
 * @returns {ElementCompact} JSON scheme
 */
function BoundingBox (bbox, srs) {
  if (!bbox) throw new Error('bbox is required')
  const west = bbox[0]
  const south = bbox[1]
  const east = bbox[2]
  const north = bbox[3]
  return clean({
    _attributes: {
      SRS: srs,
      minx: west,
      miny: south,
      maxx: east,
      maxy: north
    }
  })
}

/**
 * Clean remove undefined attributes from object
 *
 * @private
 * @param {Object} obj JSON object
 * @returns {Object} clean JSON object
 * @example
 * clean({foo: undefined, bar: 123})
 * //={bar: 123}
 * clean({foo: 0, bar: 'a'})
 * //={foo: 0, bar: 'a'}
 */
function clean (obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Normalize URL
 *
 * @private
 * @param {string} url
 * @returns {string} Normalized URL
 * @example
 * normalize('http://localhost:5000')
 * //=http://localhost:5000/
 */
function normalize (url) {
  return url && url.replace(/$\//, '')
}

/**
 * Generate an integer Array containing an arithmetic progression.
 *
 * @private
 * @param {number} [start=0] Start
 * @param {number} stop Stop
 * @param {number} [step=1] Step
 * @returns {number[]} range
 * @example
 * mercator.range(3)
 * //=[ 0, 1, 2 ]
 * mercator.range(3, 6)
 * //=[ 3, 4, 5 ]
 * mercator.range(6, 3, -1)
 * //=[ 6, 5, 4 ]
 */
function range (start, stop, step) {
  if (stop == null) {
    stop = start || 0
    start = 0
  }
  if (!step) {
    step = stop < start ? -1 : 1
  }
  var length = Math.max(Math.ceil((stop - start) / step), 0)
  var range = Array(length)
  for (var idx = 0; idx < length; idx++, start += step) {
    range[idx] = start
  }
  return range
}

module.exports = {
  getCapabilities: getCapabilities,
  exception: exception,
  Capabilities: Capabilities,
  Capability: Capability,
  Service: Service,
  Keywords: Keywords,
  Request: Request,
  TileSet: TileSet,
  Layer: Layer,
  resolutions: resolutions,
  range: range,
  clean: clean
}
