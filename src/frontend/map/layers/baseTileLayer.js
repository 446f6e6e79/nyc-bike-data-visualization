import { BitmapLayer } from '@deck.gl/layers'
import { TileLayer } from '@deck.gl/geo-layers'

/** * Creates a base tile layer using the provided tile URL template.
 * @param {string} tileUrl - The URL template for the tile server
 * @returns {TileLayer} A Deck.GL TileLayer configured to render the base map.
*/
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
