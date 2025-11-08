import {FederatedPointerEvent, Graphics, Point} from "pixi.js"

export type Corner = 'tl' | 'tr' | 'bl' | 'br' | 'rot'
interface Callbacks {
	beginDrag: (corner: Corner, start: Point) => void
	updateDrag: (corner: Corner, pos: Point) => void
	endDrag: () => void
}

export class Handle extends Graphics {
	#isDragging = false

	constructor(
		private corner: Corner,
		public cursor: string,
		private callbacks: Callbacks
	) {
		super()
		this.eventMode = 'static'
		this.#draw()

		this.on('pointerdown', this.#onDown)
		this.on('globalpointermove', this.#onMove)
		this.on('pointerup', this.#onUp)
		this.on('pointerupoutside', this.#onUp)
	}

	#draw() {
		this.circle(0, 0, 6)
		this.fill({color: '#ffffff'})
		this.stroke({width: 1, color: 0x000000, alpha: 0.4})
	}

	#onDown = (e: FederatedPointerEvent) => {
		this.#isDragging = true
		this.cursor = 'grabbing'
		this.callbacks.beginDrag(this.corner, e.global)
		e.stopPropagation()
	}

	#onMove = (e: FederatedPointerEvent) => {
		if (!this.#isDragging) return
		this.callbacks.updateDrag(this.corner, e.global)
		e.stopPropagation()
	}

	#onUp = (e: FederatedPointerEvent) => {
		if (!this.#isDragging) return
		this.#isDragging = false
		this.cursor = 'pointer'
		this.callbacks.endDrag()
		e.stopPropagation()
	}
}
