import { BitmapLayer } from '@deck.gl/layers'
import { TileLayer } from '@deck.gl/geo-layers'

// Create the base map tile layer using OpenStreetMap tiles
export function createBaseTileLayer(tileUrl) {
  return new TileLayer({
    id: 'osm-base-map', 
    data: tileUrl,          // URL for the tile server
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    // Render each tile as a BitmapLayer
    renderSubLayers: (props) => {
      const bbox = props.tile?.bbox
      if (!bbox) {
        return null
      }

      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [bbox.west, bbox.south, bbox.east, bbox.north],
      })
    },
  })
}
