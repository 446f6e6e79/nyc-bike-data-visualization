import '@testing-library/jest-dom'

// Avoid Plotly side-effects in jsdom during component smoke tests.
vi.mock('react-plotly.js', () => ({
	default: () => null,
}))

// Need to avoid build errors from Plotly's mapbox module
window.URL.createObjectURL = vi.fn()

// jsdom does not implement canvas APIs used by Plotly/Chart.js.
if (typeof HTMLCanvasElement !== 'undefined') {
	const canvasContextStub = new Proxy(
		{
			canvas: null,
			measureText: () => ({ width: 0 }),
			createLinearGradient: () => ({ addColorStop: vi.fn() }),
			createRadialGradient: () => ({ addColorStop: vi.fn() }),
			getImageData: () => ({ data: new Uint8ClampedArray(4) }),
			putImageData: vi.fn(),
			setLineDash: vi.fn(),
		},
		{
			get(target, prop) {
				if (prop in target) return target[prop]
				return vi.fn()
			},
		}
	)

	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext() {
		canvasContextStub.canvas = this
		return canvasContextStub
	})

	vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,')
}
