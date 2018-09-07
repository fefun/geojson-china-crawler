var Const = {
  BBRFLAG: {
    I: 1,
    S: 2
  },
  ADCODES: {
    COUNTRY: 1e5
  }
}

var geomUtils = (function () {
  function polygonClip (subjectPolygon, clipPolygon) {
    var cp1, cp2, s, e, outputList = subjectPolygon
    cp1 = clipPolygon[clipPolygon.length - 2]
    for (var j = 0, jlen = clipPolygon.length - 1; j < jlen; j++) {
      cp2 = clipPolygon[j]
      var inputList = outputList
      outputList = []
      s = inputList[inputList.length - 1]
      for (var i = 0, len = inputList.length; i < len; i++) {
        e = inputList[i]
        if (clipInside(e, cp1, cp2)) {
          clipInside(s, cp1, cp2) ||
            outputList.push(clipIntersection(cp1, cp2, s, e))
          outputList.push(e)
        } else {
          clipInside(s, cp1, cp2) &&
            outputList.push(clipIntersection(cp1, cp2, s, e))
        }
        s = e
      }
      cp1 = cp2
    }
    if (outputList.length < 3) return []
    outputList.push(outputList[0])
    return outputList
  }
  function pointOnSegment (p, p1, p2) {
    var tx = (p2[1] - p1[1]) / (p2[0] - p1[0]) * (p[0] - p1[0]) + p1[1]
    return Math.abs(tx - p[1]) < 1e-6 && p[0] >= p1[0] && p[0] <= p2[0]
  }
  function pointOnPolygon (point, vs) {
    for (var i = 0, len = vs.length; i < len - 1; i++) {
      if (pointOnSegment(point, vs[i], vs[i + 1])) return !0
    }
    return !1
  }
  function pointInPolygon (point, vs) {
    for (
      var x = point[0],
        y = point[1],
        inside = !1,
        i = 0,
        len = vs.length,
        j = len - 1;
      i < len;
      j = i++
    ) {
      var xi = vs[i][0],
        yi = vs[i][1],
        xj = vs[j][0],
        yj = vs[j][1],
        intersect =
          yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi
      intersect && (inside = !inside)
    }
    return inside
  }
  function getClosestPointOnSegment (p, p1, p2) {
    var t,
      x = p1[0],
      y = p1[1],
      dx = p2[0] - x,
      dy = p2[1] - y,
      dot = dx * dx + dy * dy
    if (dot > 0) {
      t = ((p[0] - x) * dx + (p[1] - y) * dy) / dot
      if (t > 1) {
        x = p2[0]
        y = p2[1]
      } else if (t > 0) {
        x += dx * t
        y += dy * t
      }
    }
    return [x, y]
  }
  function sqClosestDistanceToSegment (p, p1, p2) {
    var p3 = getClosestPointOnSegment(p, p1, p2),
      dx = p[0] - p3[0],
      dy = p[1] - p3[1]
    return dx * dx + dy * dy
  }
  function sqClosestDistanceToPolygon (p, points) {
    for (
      var minSq = Number.MAX_VALUE, i = 0, len = points.length;
      i < len - 1;
      i++
    ) {
      var sq = sqClosestDistanceToSegment(p, points[i], points[i + 1])
      sq < minSq && (minSq = sq)
    }
    return minSq
  }
  var clipInside = function (p, cp1, cp2) {
      return (
      (cp2[0] - cp1[0]) * (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * (p[0] - cp1[0])
      )
    },
    clipIntersection = function (cp1, cp2, s, e) {
      var dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]],
        dp = [s[0] - e[0], s[1] - e[1]],
        n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0],
        n2 = s[0] * e[1] - s[1] * e[0],
        n3 = 1 / (dc[0] * dp[1] - dc[1] * dp[0])
      return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3]
    }
  return {
    sqClosestDistanceToPolygon: sqClosestDistanceToPolygon,
    sqClosestDistanceToSegment: sqClosestDistanceToSegment,
    pointOnSegment: pointOnSegment,
    pointOnPolygon: pointOnPolygon,
    pointInPolygon: pointInPolygon,
    polygonClip: polygonClip
  }
})()
var bbIdxBuilder = (function () {
  function parseRanges (ranges, radix) {
    for (var nums = [], i = 0, len = ranges.length; i < len; i++) {
      var parts = ranges[i].split('-'),
        start = parts[0],
        end = parts.length > 1 ? parts[1] : start
      start = parseInt(start, radix)
      end = parseInt(end, radix)
      for (var j = start; j <= end; j++) {
        nums.push(j)
      }
    }
    return nums
  }
  function add2BBList (bbList, seqIdx, result) {
    if (bbList[seqIdx]) throw new Error('Alreay exists: ', bbList[seqIdx])
    bbList[seqIdx] = result
  }
  function getFlagI (idx) {
    flagIList[idx] || (flagIList[idx] = [BBRFLAG.I, idx])
    return flagIList[idx]
  }
  function parseILine (line, radix, bbList) {
    if (line) {
      for (
        var parts = line.split(':'),
          fIdx = parseInt(parts[0], radix),
          bIdxes = parseRanges(parts[1].split(','), radix),
          item = getFlagI(fIdx),
          i = 0,
          len = bIdxes.length;
        i < len;
        i++
      ) {
        //   if (1) console.log(fIdx, bIdxes[i],item);
        add2BBList(bbList, bIdxes[i], item)
      }
    }
  }
  function parseSLine (line, radix, bbList) {
    if (line) {
      for (
        var item,
          parts = line.split(':'),
          bIdx = parseInt(parts[0], radix),
          fList = parts[1].split(';'),
          secList = [],
          i = 0,
          len = fList.length;
        i < len;
        i++
      ) {
        parts = fList[i].split(',')
        item = [parseInt(parts[0], radix), 0]
        parts.length > 1 && (item[1] = parseInt(parts[1], radix))
        secList.push(item)
      }
      add2BBList(bbList, bIdx, [BBRFLAG.S, secList])
    }
  }
  function parseMaxRect (l, radix) {
    if (!l) return null
    for (
      var parts = l.split(','), rect = [], i = 0, len = parts.length;
      i < len;
      i++
    ) {
      var n = parseInt(parts[i], radix)
      if (n < 0) return null
      rect.push(parseInt(parts[i], radix))
    }
    return rect
  }
  function parseMultiMaxRect (l, radix) {
    if (!l) return null
    for (
      var parts = l.split(';'), rectList = [], i = 0, len = parts.length;
      i < len;
      i++
    ) {
      rectList.push(parseMaxRect(parts[i], radix))
    }
    return rectList
  }
  function buildIdxList (res) {
    var i, len, radix = res.r, bbList = [], inList = res.idx.i.split('|')
    res.idx.i = null
    for ((i = 0), (len = inList.length); i < len; i++) {
      parseILine(inList[i], radix, bbList)
    }
    inList.length = 0
    var secList = res.idx.s.split('|')
    res.idx.s = null
    // console.log(bbList.slice(0, 10))
    for ((i = 0), (len = secList.length); i < len; i++) {
      parseSLine(secList[i], radix, bbList)
    }
    secList.length = 0
    res.idx = null
    // console.log(JSON.stringify(bbList))
    // console.log(bbList.slice(0, 10))

    res.idxList = bbList
    if (res.mxr) {
      res.maxRect = parseMaxRect(res.mxr, radix)
      res.mxr = null
    }
    if (res.mxsr) {
      res.maxSubRect = parseMultiMaxRect(res.mxsr, radix)
      res.mxsr = null
    }
  }
  function buildRectFeatureClip (data, rect, ringIdxList) {
    for (
      var features = data.geoData.sub.features, i = 0, len = ringIdxList.length;
      i < len;
      i++
    ) {
      var idxItem = ringIdxList[i],
        feature = features[idxItem[0]],
        ring = feature.geometry.coordinates[idxItem[1]][0],
        clipedRing = geomUtils.polygonClip(ring, rect)
      !clipedRing || clipedRing.length < 4
        ? console.warn('Cliped ring length werid: ' + clipedRing)
        : (idxItem[2] = clipedRing)
    }
    return !0
  }
  function prepareGridFeatureClip (data, x, y) {
    var bbIdx = data.bbIndex, step = bbIdx.s
    ;(x < 0 || y < 0 || y >= bbIdx.h || x >= bbIdx.w) &&
      console.warn('Wrong x,y', x, y, bbIdx)
    var seqIdx = y * bbIdx.w + x, idxItem = bbIdx.idxList[seqIdx]
    if (idxItem[0] !== BBRFLAG.S) return !1
    var ringIdxList = idxItem[1]
    if (ringIdxList[0].length > 2) return !1
    var rectX = x * step + bbIdx.l, rectY = y * step + bbIdx.t
    buildRectFeatureClip(
      data,
      [
        [rectX, rectY],
        [rectX + step, rectY],
        [rectX + step, rectY + step],
        [rectX, rectY + step],
        [rectX, rectY]
      ],
      ringIdxList
    )
    return !0
  }
  var BBRFLAG = Const.BBRFLAG, flagIList = []
  return {
    prepareGridFeatureClip: prepareGridFeatureClip,
    buildIdxList: buildIdxList
  }
})()
var BoundsItem = (function () {
  function BoundsItem (x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }
  Object.assign(BoundsItem, {
    getBoundsItemToExpand: function () {
      return new BoundsItem(Number.MAX_VALUE, Number.MAX_VALUE, -1, -1)
    },
    boundsContainPoint: function (b, p) {
      return (
        b.x <= p.x &&
        b.x + b.width >= p.x &&
        b.y <= p.y &&
        b.y + b.height >= p.y
      )
    },
    boundsContain: function (b1, b2) {
      return (
        b1.x <= b2.x &&
        b1.x + b1.width >= b2.x + b2.width &&
        b1.y <= b2.y &&
        b1.y + b1.height >= b2.y + b2.height
      )
    },
    boundsIntersect: function (b1, b2) {
      return (
        b1.x <= b2.x + b2.width &&
        b2.x <= b1.x + b1.width &&
        b1.y <= b2.y + b2.height &&
        b2.y <= b1.y + b1.height
      )
    }
  })
  Object.assign(BoundsItem.prototype, {
    containBounds: function (b) {
      return BoundsItem.boundsContain(this, b)
    },
    containPoint: function (p) {
      return BoundsItem.boundsContainPoint(this, p)
    },
    clone: function () {
      return new BoundsItem(this.x, this.y, this.width, this.height)
    },
    isEmpty: function () {
      return this.width < 0
    },
    getMin: function () {
      return {
        x: this.x,
        y: this.y
      }
    },
    getMax: function () {
      return {
        x: this.x + this.width,
        y: this.y + this.height
      }
    },
    expandByPoint: function (x, y) {
      var minX, minY, maxX, maxY
      if (this.isEmpty()) {
        minX = maxX = x
        minY = maxY = y
      } else {
        minX = this.x
        minY = this.y
        maxX = this.x + this.width
        maxY = this.y + this.height
        x < minX ? (minX = x) : x > maxX && (maxX = x)
        y < minY ? (minY = y) : y > maxY && (maxY = y)
      }
      this.x = minX
      this.y = minY
      this.width = maxX - minX
      this.height = maxY - minY
    },
    expandByBounds: function (bounds) {
      if (!bounds.isEmpty()) {
        var minX = this.x,
          minY = this.y,
          maxX = this.x + this.width,
          maxY = this.y + this.height,
          newMinX = bounds.x,
          newMaxX = bounds.x + bounds.width,
          newMinY = bounds.y,
          newMaxY = bounds.y + bounds.height
        if (this.isEmpty()) {
          minX = newMinX
          minY = newMinY
          maxX = newMaxX
          maxY = newMaxY
        } else {
          newMinX < minX && (minX = newMinX)
          newMaxX > maxX && (maxX = newMaxX)
          newMinY < minY && (minY = newMinY)
          newMaxY > maxY && (maxY = newMaxY)
        }
        this.x = minX
        this.y = minY
        this.width = maxX - minX
        this.height = maxY - minY
      }
    },
    getTopLeft: function () {
      return {
        x: this.x,
        y: this.y
      }
    },
    getTopRight: function () {
      return {
        x: this.x + this.width,
        y: this.y
      }
    },
    getBottomLeft: function () {
      return {
        x: this.x,
        y: this.y + this.height
      }
    },
    getBottomRight: function () {
      return {
        x: this.x + this.width,
        y: this.y + this.height
      }
    }
  })
  return BoundsItem
})()
var topojson = (function (params) {
  function feature$1 (topology, o) {
    var id = o.id,
      bbox = o.bbox,
      properties = o.properties == null ? {} : o.properties,
      geometry = object(topology, o)
    return id == null && bbox == null
      ? {
        type: 'Feature',
        properties: properties,
        geometry: geometry
      }
      : bbox == null
          ? {
            type: 'Feature',
            id: id,
            properties: properties,
            geometry: geometry
          }
          : {
            type: 'Feature',
            id: id,
            bbox: bbox,
            properties: properties,
            geometry: geometry
          }
  }
  function object (topology, o) {
    function arc (i, points) {
      points.length && points.pop()
      for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
        points.push(transformPoint(a[k], k))
      }
      i < 0 && reverse(points, n)
    }
    function point (p) {
      return transformPoint(p)
    }
    function line (arcs) {
      for (var points = [], i = 0, n = arcs.length; i < n; ++i) {
        arc(arcs[i], points)
      }
      points.length < 2 && points.push(points[0])
      return points
    }
    function ring (arcs) {
      for (var points = line(arcs); points.length < 4;) {
        points.push(points[0])
      }
      return points
    }
    function polygon (arcs) {
      return arcs.map(ring)
    }
    function geometry (o) {
      var coordinates, type = o.type
      switch (type) {
        case 'GeometryCollection':
          return {
            type: type,
            geometries: o.geometries.map(geometry)
          }

        case 'Point':
          coordinates = point(o.coordinates)
          break

        case 'MultiPoint':
          coordinates = o.coordinates.map(point)
          break

        case 'LineString':
          coordinates = line(o.arcs)
          break

        case 'MultiLineString':
          coordinates = o.arcs.map(line)
          break

        case 'Polygon':
          coordinates = polygon(o.arcs)
          break

        case 'MultiPolygon':
          coordinates = o.arcs.map(polygon)
          break

        default:
          return null
      }
      return {
        type: type,
        coordinates: coordinates
      }
    }
    var transformPoint = transform(topology.transform), arcs = topology.arcs
    return geometry(o)
  }
  function meshArcs (topology, object$$1, filter) {
    var arcs, i, n
    if (arguments.length > 1) arcs = extractArcs(topology, object$$1, filter)
    else {
      for (
        (i = 0), (arcs = new Array((n = topology.arcs.length)));
        i < n;
        ++i
      ) {
        arcs[i] = i
      }
    }
    return {
      type: 'MultiLineString',
      arcs: stitch(topology, arcs)
    }
  }
  function extractArcs (topology, object$$1, filter) {
    function extract0 (i) {
      var j = i < 0 ? ~i : i
      ;(geomsByArc[j] || (geomsByArc[j] = [])).push({
        i: i,
        g: geom
      })
    }
    function extract1 (arcs) {
      arcs.forEach(extract0)
    }
    function extract2 (arcs) {
      arcs.forEach(extract1)
    }
    function extract3 (arcs) {
      arcs.forEach(extract2)
    }
    function geometry (o) {
      switch (((geom = o), o.type)) {
        case 'GeometryCollection':
          o.geometries.forEach(geometry)
          break

        case 'LineString':
          extract1(o.arcs)
          break

        case 'MultiLineString':
        case 'Polygon':
          extract2(o.arcs)
          break

        case 'MultiPolygon':
          extract3(o.arcs)
      }
    }
    var geom, arcs = [], geomsByArc = []
    geometry(object$$1)
    geomsByArc.forEach(
      filter == null
        ? function (geoms) {
          arcs.push(geoms[0].i)
        }
        : function (geoms) {
          filter(geoms[0].g, geoms[geoms.length - 1].g) &&
              arcs.push(geoms[0].i)
        }
    )
    return arcs
  }
  function planarRingArea (ring) {
    for (var a, i = -1, n = ring.length, b = ring[n - 1], area = 0; ++i < n;) {
      ;(a = b), (b = ring[i]), (area += a[0] * b[1] - a[1] * b[0])
    }
    return Math.abs(area)
  }
  function mergeArcs (topology, objects) {
    function geometry (o) {
      switch (o.type) {
        case 'GeometryCollection':
          o.geometries.forEach(geometry)
          break

        case 'Polygon':
          extract(o.arcs)
          break

        case 'MultiPolygon':
          o.arcs.forEach(extract)
      }
    }
    function extract (polygon) {
      polygon.forEach(function (ring) {
        ring.forEach(function (arc) {
          ;(polygonsByArc[(arc = arc < 0 ? ~arc : arc)] ||
            (polygonsByArc[arc] = []))
            .push(polygon)
        })
      })
      polygons.push(polygon)
    }
    function area (ring) {
      return planarRingArea(
        object(topology, {
          type: 'Polygon',
          arcs: [ring]
        }).coordinates[0]
      )
    }
    var polygonsByArc = {}, polygons = [], groups = []
    objects.forEach(geometry)
    polygons.forEach(function (polygon) {
      if (!polygon._) {
        var group = [], neighbors = [polygon]
        polygon._ = 1
        groups.push(group)
        for (; (polygon = neighbors.pop());) {
          group.push(polygon)
          polygon.forEach(function (ring) {
            ring.forEach(function (arc) {
              polygonsByArc[arc < 0 ? ~arc : arc].forEach(function (polygon) {
                if (!polygon._) {
                  polygon._ = 1
                  neighbors.push(polygon)
                }
              })
            })
          })
        }
      }
    })
    polygons.forEach(function (polygon) {
      delete polygon._
    })
    return {
      type: 'MultiPolygon',
      arcs: groups.map(function (polygons) {
        var n, arcs = []
        polygons.forEach(function (polygon) {
          polygon.forEach(function (ring) {
            ring.forEach(function (arc) {
              polygonsByArc[arc < 0 ? ~arc : arc].length < 2 && arcs.push(arc)
            })
          })
        })
        arcs = stitch(topology, arcs)
        if ((n = arcs.length) > 1) {
          for (var ki, t, i = 1, k = area(arcs[0]); i < n; ++i) {
            ;(ki = area(arcs[i])) > k &&
              ((t = arcs[0]), (arcs[0] = arcs[i]), (arcs[i] = t), (k = ki))
          }
        }
        return arcs
      })
    }
  }
  var identity = function (x) {
      return x
    },
    transform = function (transform) {
      if (transform == null) return identity
      var x0,
        y0,
        kx = transform.scale[0],
        ky = transform.scale[1],
        dx = transform.translate[0],
        dy = transform.translate[1]
      return function (input, i) {
        i || (x0 = y0 = 0)
        var j = 2, n = input.length, output = new Array(n)
        output[0] = (x0 += input[0]) * kx + dx
        output[1] = (y0 += input[1]) * ky + dy
        for (; j < n;) {
          ;(output[j] = input[j]), ++j
        }
        return output
      }
    },
    bbox = function (topology) {
      function bboxPoint (p) {
        p = t(p)
        p[0] < x0 && (x0 = p[0])
        p[0] > x1 && (x1 = p[0])
        p[1] < y0 && (y0 = p[1])
        p[1] > y1 && (y1 = p[1])
      }
      function bboxGeometry (o) {
        switch (o.type) {
          case 'GeometryCollection':
            o.geometries.forEach(bboxGeometry)
            break

          case 'Point':
            bboxPoint(o.coordinates)
            break

          case 'MultiPoint':
            o.coordinates.forEach(bboxPoint)
        }
      }
      var key,
        t = transform(topology.transform),
        x0 = 1 / 0,
        y0 = x0,
        x1 = -x0,
        y1 = -x0
      topology.arcs.forEach(function (arc) {
        for (var p, i = -1, n = arc.length; ++i < n;) {
          p = t(arc[i], i)
          p[0] < x0 && (x0 = p[0])
          p[0] > x1 && (x1 = p[0])
          p[1] < y0 && (y0 = p[1])
          p[1] > y1 && (y1 = p[1])
        }
      })
      for (key in topology.objects) {
        bboxGeometry(topology.objects[key])
      }
      return [x0, y0, x1, y1]
    },
    reverse = function (array, n) {
      for (var t, j = array.length, i = j - n; i < --j;) {
        ;(t = array[i]), (array[i++] = array[j]), (array[j] = t)
      }
    },
    feature = function (topology, o) {
      return o.type === 'GeometryCollection'
        ? {
          type: 'FeatureCollection',
          features: o.geometries.map(function (o) {
            return feature$1(topology, o)
          })
        }
        : feature$1(topology, o)
    },
    stitch = function (topology, arcs) {
      function ends (i) {
        var p1, arc = topology.arcs[i < 0 ? ~i : i], p0 = arc[0]
        topology.transform
          ? ((p1 = [0, 0]), arc.forEach(function (dp) {
            ;(p1[0] += dp[0]), (p1[1] += dp[1])
          }))
          : (p1 = arc[arc.length - 1])
        return i < 0 ? [p1, p0] : [p0, p1]
      }
      function flush (fragmentByEnd, fragmentByStart) {
        for (var k in fragmentByEnd) {
          var f = fragmentByEnd[k]
          delete fragmentByStart[f.start]
          delete f.start
          delete f.end
          f.forEach(function (i) {
            stitchedArcs[i < 0 ? ~i : i] = 1
          })
          fragments.push(f)
        }
      }
      var stitchedArcs = {},
        fragmentByStart = {},
        fragmentByEnd = {},
        fragments = [],
        emptyIndex = -1
      arcs.forEach(function (i, j) {
        var t, arc = topology.arcs[i < 0 ? ~i : i]
        arc.length < 3 &&
          !arc[1][0] &&
          !arc[1][1] &&
          ((t = arcs[++emptyIndex]), (arcs[emptyIndex] = i), (arcs[j] = t))
      })
      arcs.forEach(function (i) {
        var f, g, e = ends(i), start = e[0], end = e[1]
        if ((f = fragmentByEnd[start])) {
          delete fragmentByEnd[f.end]
          f.push(i)
          f.end = end
          if ((g = fragmentByStart[end])) {
            delete fragmentByStart[g.start]
            var fg = g === f ? f : f.concat(g)
            fragmentByStart[(fg.start = f.start)] = fragmentByEnd[
              (fg.end = g.end)
            ] = fg
          } else fragmentByStart[f.start] = fragmentByEnd[f.end] = f
        } else if ((f = fragmentByStart[end])) {
          delete fragmentByStart[f.start]
          f.unshift(i)
          f.start = start
          if ((g = fragmentByEnd[start])) {
            delete fragmentByEnd[g.end]
            var gf = g === f ? f : g.concat(f)
            fragmentByStart[(gf.start = g.start)] = fragmentByEnd[
              (gf.end = f.end)
            ] = gf
          } else fragmentByStart[f.start] = fragmentByEnd[f.end] = f
        } else {
          f = [i]
          fragmentByStart[(f.start = start)] = fragmentByEnd[(f.end = end)] = f
        }
      })
      flush(fragmentByEnd, fragmentByStart)
      flush(fragmentByStart, fragmentByEnd)
      arcs.forEach(function (i) {
        stitchedArcs[i < 0 ? ~i : i] || fragments.push([i])
      })
      return fragments
    },
    mesh = function (topology) {
      return object(topology, meshArcs.apply(this, arguments))
    },
    merge = function (topology) {
      return object(topology, mergeArcs.apply(this, arguments))
    },
    bisect = function (a, x) {
      for (var lo = 0, hi = a.length; lo < hi;) {
        var mid = (lo + hi) >>> 1
        a[mid] < x ? (lo = mid + 1) : (hi = mid)
      }
      return lo
    },
    neighbors = function (objects) {
      function line (arcs, i) {
        arcs.forEach(function (a) {
          a < 0 && (a = ~a)
          var o = indexesByArc[a]
          o ? o.push(i) : (indexesByArc[a] = [i])
        })
      }
      function polygon (arcs, i) {
        arcs.forEach(function (arc) {
          line(arc, i)
        })
      }
      function geometry (o, i) {
        o.type === 'GeometryCollection'
          ? o.geometries.forEach(function (o) {
            geometry(o, i)
          })
          : o.type in geometryType && geometryType[o.type](o.arcs, i)
      }
      var indexesByArc = {},
        neighbors = objects.map(function () {
          return []
        }),
        geometryType = {
          LineString: line,
          MultiLineString: polygon,
          Polygon: polygon,
          MultiPolygon: function (arcs, i) {
            arcs.forEach(function (arc) {
              polygon(arc, i)
            })
          }
        }
      objects.forEach(geometry)
      for (var i in indexesByArc) {
        for (
          var indexes = indexesByArc[i], m = indexes.length, j = 0;
          j < m;
          ++j
        ) {
          for (var k = j + 1; k < m; ++k) {
            var n, ij = indexes[j], ik = indexes[k]
            ;(n = neighbors[ij])[(i = bisect(n, ik))] !== ik &&
              n.splice(i, 0, ik)
            ;(n = neighbors[ik])[(i = bisect(n, ij))] !== ij &&
              n.splice(i, 0, ij)
          }
        }
      }
      return neighbors
    },
    untransform = function (transform) {
      if (transform == null) return identity
      var x0,
        y0,
        kx = transform.scale[0],
        ky = transform.scale[1],
        dx = transform.translate[0],
        dy = transform.translate[1]
      return function (input, i) {
        i || (x0 = y0 = 0)
        var j = 2,
          n = input.length,
          output = new Array(n),
          x1 = Math.round((input[0] - dx) / kx),
          y1 = Math.round((input[1] - dy) / ky)
          ;(output[0] = x1 - x0), (x0 = x1)
        ;(output[1] = y1 - y0), (y0 = y1)
        for (; j < n;) {
          ;(output[j] = input[j]), ++j
        }
        return output
      }
    },
    quantize = function (topology, transform) {
      function quantizePoint (point) {
        return t(point)
      }
      function quantizeGeometry (input) {
        var output
        switch (input.type) {
          case 'GeometryCollection':
            output = {
              type: 'GeometryCollection',
              geometries: input.geometries.map(quantizeGeometry)
            }
            break

          case 'Point':
            output = {
              type: 'Point',
              coordinates: quantizePoint(input.coordinates)
            }
            break

          case 'MultiPoint':
            output = {
              type: 'MultiPoint',
              coordinates: input.coordinates.map(quantizePoint)
            }
            break

          default:
            return input
        }
        input.id != null && (output.id = input.id)
        input.bbox != null && (output.bbox = input.bbox)
        input.properties != null && (output.properties = input.properties)
        return output
      }
      function quantizeArc (input) {
        var p, i = 0, j = 1, n = input.length, output = new Array(n)
        output[0] = t(input[0], 0)
        for (; ++i < n;) {
          ;((p = t(input[i], i))[0] || p[1]) && (output[j++] = p)
        }
        j === 1 && (output[j++] = [0, 0])
        output.length = j
        return output
      }
      if (topology.transform) throw new Error('already quantized')
      if (transform && transform.scale) box = topology.bbox
      else {
        if (!((n = Math.floor(transform)) >= 2)) throw new Error('n must be ≥2')
        box = topology.bbox || bbox(topology)
        var n, x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3]
        transform = {
          scale: [
            x1 - x0 ? (x1 - x0) / (n - 1) : 1,
            y1 - y0 ? (y1 - y0) / (n - 1) : 1
          ],
          translate: [x0, y0]
        }
      }
      var box,
        key,
        t = untransform(transform),
        inputs = topology.objects,
        outputs = {}
      for (key in inputs) {
        outputs[key] = quantizeGeometry(inputs[key])
      }
      return {
        type: 'Topology',
        bbox: box,
        transform: transform,
        objects: outputs,
        arcs: topology.arcs.map(quantizeArc)
      }
    }
  let _exports = {}
  _exports.bbox = bbox
  _exports.feature = feature
  _exports.mesh = mesh
  _exports.meshArcs = meshArcs
  _exports.merge = merge
  _exports.mergeArcs = mergeArcs
  _exports.neighbors = neighbors
  _exports.quantize = quantize
  _exports.transform = transform
  _exports.untransform = untransform
  return _exports
})()
var distDataParser = (function () {
  function parseTopo (topo) {
    var result = {}, objects = topo.objects
    for (var k in objects) {
      objects.hasOwnProperty(k) &&
        (result[k] = topojson.feature(topo, objects[k]))
    }
    return result
  }
  function filterSub (geoData) {
    for (
      var features = geoData.sub.features,
        parentProps = geoData.parent.properties,
        subAcroutes = (parentProps.acroutes || []).concat([parentProps.adcode]),
        i = 0,
        len = features.length;
      i < len;
      i++
    ) {
      features[i].properties.subFeatureIndex = i
      features[i].properties.acroutes = subAcroutes
    }
  }
  function buildData (data) {
    if (!data._isBuiled) {
      bbIdxBuilder.buildIdxList(data.bbIndex)
      data.geoData = parseTopo(data.topo)
      filterSub(data.geoData)
      var bbox = data.topo.bbox
      data.bounds = new BoundsItem(
        bbox[0],
        bbox[1],
        bbox[2] - bbox[0],
        bbox[3] - bbox[1]
      )
      data.topo = null
      data._isBuiled = !0
    }
    return data
  }
  return {
    buildData: buildData
  }
})()
var SphericalMercator = (function (params) {
  function getScale (level) {
    scaleCache[level] || (scaleCache[level] = 256 * Math.pow(2, level))
    return scaleCache[level]
  }
  function project (lnglat) {
    var lat = Math.max(Math.min(maxLat, lnglat[1]), -maxLat),
      x = lnglat[0] * deg2rad,
      y = lat * deg2rad
    y = Math.log(Math.tan(quadPI + y / 2))
    return [x, y]
  }
  function transform (point, scale) {
    scale = scale || 1
    var a = half2PI, b = 0.5, c = -a, d = 0.5
    return [scale * (a * point[0] + b), scale * (c * point[1] + d)]
  }
  function unproject (point) {
    var lng = point[0] * rad2deg,
      lat = (2 * Math.atan(Math.exp(point[1])) - Math.PI / 2) * rad2deg
    return [parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))]
  }
  function untransform (point, scale) {
    var a = half2PI, b = 0.5, c = -a, d = 0.5
    return [(point[0] / scale - b) / a, (point[1] / scale - d) / c]
  }
  function lngLatToPointByScale (lnglat, scale, round) {
    var p = transform(project(lnglat), scale)
    if (round) {
      p[0] = Math.round(p[0])
      p[1] = Math.round(p[1])
    }
    return p
  }
  function lngLatToPoint (lnglat, level, round) {
    return lngLatToPointByScale(lnglat, getScale(level), round)
  }
  function pointToLngLat (point, level) {
    var scale = getScale(level), untransformedPoint = untransform(point, scale)
    return unproject(untransformedPoint)
  }
  function haversineDistance (point1, point2) {
    var cos = Math.cos,
      lat1 = point1[1] * deg2rad,
      lon1 = point1[0] * deg2rad,
      lat2 = point2[1] * deg2rad,
      lon2 = point2[0] * deg2rad,
      dLat = lat2 - lat1,
      dLon = lon2 - lon1,
      a = (1 - cos(dLat) + (1 - cos(dLon)) * cos(lat1) * cos(lat2)) / 2
    return earthDiameter * Math.asin(Math.sqrt(a))
  }
  var scaleCache = {},
    earthDiameter = 12756274,
    deg2rad = Math.PI / 180,
    rad2deg = 180 / Math.PI,
    quadPI = Math.PI / 4,
    maxLat = 85.0511287798,
    half2PI = 0.5 / Math.PI
  return {
    haversineDistance: haversineDistance,
    getScale: getScale,
    lngLatToPointByScale: lngLatToPointByScale,
    pointToLngLat: pointToLngLat,
    lngLatToPoint: lngLatToPoint
  }
})()
var AreaNode = (function (params) {
  function AreaNode (adcode, data, opts) {
    this.adcode = adcode
    this._data = data
    this._sqScaleFactor = data.scale * data.scale
    this._opts = Object.assign(
      {
        nearTolerance: 2
      },
      opts
    )
    this.setNearTolerance(this._opts.nearTolerance)
  }
  var staticMethods = {
    getPropsOfFeature: function (f) {
      return f && f.properties ? f.properties : null
    },
    getAdcodeOfFeature: function (f) {
      return f ? f.properties.adcode : null
    },
    doesFeatureHasChildren: function (f) {
      return !!f && f.properties.childrenNum > 0
    }
  }
  Object.assign(AreaNode, staticMethods)
  Object.assign(AreaNode.prototype, staticMethods, {
    setNearTolerance: function (t) {
      this._opts.nearTolerance = t
      this._sqNearTolerance = t * t
    },
    getIdealZoom: function () {
      return this._data.idealZoom
    },
    _getEmptySubFeatureGroupItem: function (idx) {
      return {
        subFeatureIndex: idx,
        subFeature: this.getSubFeatureByIndex(idx),
        pointsIndexes: [],
        points: []
      }
    },
    groupByPosition: function (points, getPosition) {
      var i, len, groupMap = {}, outsideItem = null
      for ((i = 0), (len = points.length); i < len; i++) {
        var idx = this.getLocatedSubFeatureIndex(
          getPosition.call(null, points[i], i)
        )
        groupMap[idx] ||
          (groupMap[idx] = this._getEmptySubFeatureGroupItem(idx))
        groupMap[idx].pointsIndexes.push(i)
        groupMap[idx].points.push(points[i])
        idx < 0 && (outsideItem = groupMap[idx])
      }
      var groupList = []
      for (
        (i = 0), (len = this._data.geoData.sub.features.length);
        i < len;
        i++
      ) {
        groupList.push(groupMap[i] || this._getEmptySubFeatureGroupItem(i))
      }
      outsideItem && groupList.push(outsideItem)
      groupMap = null
      return groupList
    },
    getLocatedSubFeature: function (lngLat) {
      var fIdx = this.getLocatedSubFeatureIndex(lngLat)
      return this.getSubFeatureByIndex(fIdx)
    },
    getLocatedSubFeatureIndex: function (lngLat) {
      return this._getLocatedSubFeatureIndexByPixel(
        this.lngLatToPixel(lngLat, this._data.pz)
      )
    },
    getSubFeatureByIndex: function (fIdx) {
      if (fIdx >= 0) {
        var features = this.getSubFeatures()
        return features[fIdx]
      }
      return null
    },
    getSubFeatureByAdcode: function (adcode) {
      adcode = parseInt(adcode, 10)
      for (
        var features = this.getSubFeatures(), i = 0, len = features.length;
        i < len;
        i++
      ) {
        if (this.getAdcodeOfFeature(features[i]) === adcode) return features[i]
      }
      return null
    },
    _getLocatedSubFeatureIndexByPixel: function (pixel) {
      var data = this._data,
        bbIdx = data.bbIndex,
        offX = pixel[0] - bbIdx.l,
        offY = pixel[1] - bbIdx.t,
        y = Math.floor(offY / bbIdx.s),
        x = Math.floor(offX / bbIdx.s)
      if (x < 0 || y < 0 || y >= bbIdx.h || x >= bbIdx.w) return -1
      var seqIdx = y * bbIdx.w + x, idxItem = bbIdx.idxList[seqIdx]
      if (!idxItem) return -1
      var BBRFLAG = Const.BBRFLAG
      switch (idxItem[0]) {
        case BBRFLAG.I:
          return idxItem[1]

        case BBRFLAG.S:
          bbIdxBuilder.prepareGridFeatureClip(data, x, y, idxItem[1])
          return this._calcLocatedFeatureIndexOfSList(pixel, idxItem[1])

        default:
          throw new Error('Unknown BBRFLAG: ' + idxItem[0])
      }
    },
    _calcNearestFeatureIndexOfSList: function (pixel, list) {
      for (
        var features = this._data.geoData.sub.features,
          closest = {
            sq: Number.MAX_VALUE,
            idx: -1
          },
          i = 0,
          len = list.length;
        i < len;
        i++
      ) {
        var idxItem = list[i],
          feature = features[idxItem[0]],
          ring = idxItem[2] || feature.geometry.coordinates[idxItem[1]][0],
          sqDistance = geomUtils.sqClosestDistanceToPolygon(pixel, ring)
        if (sqDistance < closest.sq) {
          closest.sq = sqDistance
          closest.idx = idxItem[0]
        }
      }
      return closest.sq / this._sqScaleFactor < this._sqNearTolerance
        ? closest.idx
        : -1
    },
    _calcLocatedFeatureIndexOfSList: function (pixel, list) {
      for (
        var features = this._data.geoData.sub.features,
          i = 0,
          len = list.length;
        i < len;
        i++
      ) {
        var idxItem = list[i],
          feature = features[idxItem[0]],
          ring = idxItem[2] || feature.geometry.coordinates[idxItem[1]][0]
        if (
          geomUtils.pointInPolygon(pixel, ring) ||
          geomUtils.pointOnPolygon(pixel, ring)
        ) {
          return idxItem[0]
        }
      }
      return this._calcNearestFeatureIndexOfSList(pixel, list)
    },
    pixelToLngLat: function (x, y) {
      return SphericalMercator.pointToLngLat([x, y], this._data.pz)
    },
    lngLatToPixel: function (lngLat) {
      lngLat instanceof AMap.LngLat &&
        (lngLat = [lngLat.getLng(), lngLat.getLat()])
      var pMx = SphericalMercator.lngLatToPoint(lngLat, this._data.pz)
      return [Math.round(pMx[0]), Math.round(pMx[1])]
    },
    _convertRingCoordsToLngLats: function (ring) {
      for (var list = [], i = 0, len = ring.length; i < len; i++) {
        list[i] = this.pixelToLngLat(ring[i][0], ring[i][1])
      }
      return list
    },
    _convertPolygonCoordsToLngLats: function (poly) {
      for (var list = [], i = 0, len = poly.length; i < len; i++) {
        list[i] = this._convertRingCoordsToLngLats(poly[i])
      }
      return list
    },
    _convertMultiPolygonCoordsToLngLats: function (polys) {
      for (var list = [], i = 0, len = polys.length; i < len; i++) {
        list[i] = this._convertPolygonCoordsToLngLats(polys[i])
      }
      return list
    },
    _convertCoordsToLngLats: function (type, coordinates) {
      switch (type) {
        case 'MultiPolygon':
          return this._convertMultiPolygonCoordsToLngLats(coordinates)

        default:
          throw new Error('Unknown type', type)
      }
    },
    _createLngLatFeature: function (f, extraProps) {
      var newNode = Object.assign({}, f)
      extraProps && Object.assign(newNode.properties, extraProps)
      newNode.geometry = Object.assign({}, newNode.geometry)
      newNode.geometry.coordinates = this._convertCoordsToLngLats(
        newNode.geometry.type,
        newNode.geometry.coordinates
      )
      return newNode
    },
    getAdcode: function () {
      return this.getProps('adcode')
    },
    getName: function () {
      return this.getProps('name')
    },
    getChildrenNum: function () {
      return this.getProps('childrenNum')
    },
    getProps: function (key) {
      var props = AreaNode.getPropsOfFeature(this._data.geoData.parent)
      return props ? key ? props[key] : props : null
    },
    getParentFeature: function () {
      var geoData = this._data.geoData
      geoData.lngLatParent ||
        (geoData.lngLatParent = this._createLngLatFeature(geoData.parent))
      return geoData.lngLatParent
    },
    getParentFeatureInPixel: function () {
      return this._data.geoData.parent
    },
    getSubFeatures: function () {
      var geoData = this._data.geoData
      if (!geoData.lngLatSubList) {
        for (
          var features = geoData.sub.features,
            newFList = [],
            i = 0,
            len = features.length;
          i < len;
          i++
        ) {
          newFList[i] = this._createLngLatFeature(features[i])
        }
        geoData.lngLatSubList = newFList
      }
      return [].concat(geoData.lngLatSubList)
    },
    getSubFeaturesInPixel: function () {
      return [].concat(this._data.geoData.sub.features)
    },
    getBounds: function () {
      var data = this._data
      if (!data.lngLatBounds) {
        var nodeBounds = this._data.bounds
        data.lngLatBounds = new AMap.Bounds(
          this.pixelToLngLat(nodeBounds.x, nodeBounds.y + nodeBounds.height),
          this.pixelToLngLat(nodeBounds.x + nodeBounds.width, nodeBounds.y)
        )
      }
      return data.lngLatBounds
    }
  })
  return AreaNode
})()

function getFeatures (code, data) {
  let parseData = distDataParser.buildData(data)
  var areaNode = new AreaNode(code, parseData, {})
  let geo = areaNode.getSubFeatures()
  let json = {
    type: 'FeatureCollection',
    features: geo
  }
  return json
}
module.exports = {
  getFeatures: getFeatures
}
