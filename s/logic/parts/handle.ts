import {FederatedPointerEvent, Graphics, Point} from "pixi.js"

export type Side = 'ml' | 'mr' | 'mt' | 'mb'
type Corner = 'tl' | 'tr' | 'bl' | 'br' | 'rot'
export type HandleKind = Corner | Side
interface Callbacks {
	beginDrag: (handle: HandleKind, start: Point) => void
	updateDrag: (handle: HandleKind, pos: Point) => void
	endDrag: () => void
}

export class Handle extends Graphics {
	#isDragging = false

	constructor(
		private handle: HandleKind,
		public cursorName: string,
		private callbacks: Callbacks
	) {
		super()
		this.eventMode = 'static'
		this.cursor = cursorName
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
		this.callbacks.beginDrag(this.handle, e.global)
	}

	#onMove = (e: FederatedPointerEvent) => {
		if (!this.#isDragging) return
		this.callbacks.updateDrag(this.handle, e.global)
	}

	#onUp = (e: FederatedPointerEvent) => {
		if (!this.#isDragging) return
		this.#isDragging = false
		this.cursor = this.cursorName
		this.callbacks.endDrag()
	}
}
