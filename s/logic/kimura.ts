import {
	Container,
	Point,
	FederatedPointerEvent,
} from 'pixi.js'

import {Wireframe} from './parts/wireframe.js'

export class Kimura extends Container {
	group: Container[]
	wireframe = new Wireframe(this)
	isDragging = false
	lastPointer = new Point()

	constructor(opts: {group: Container[]}) {
		super()
		this.group = opts.group
		this.eventMode = 'static'

		for (const obj of this.group)
			this.addChild(obj)
	
		// parent has to be stage or something else
		this.once('added', () => this.parent?.addChild(this.wireframe))
		this.#bindEvents()
		this.#refresh()
	}

	#bindEvents() {
		this.addEventListener('pointerdown', this.#onPointerDown)
		this.addEventListener('pointerup', this.#onPointerUp)
		this.addEventListener('pointerupoutside', this.#onPointerUp)
		this.addEventListener('globalpointermove', this.#onPointerMove)
	}

	#onPointerDown = (e: FederatedPointerEvent) => {
		const global = e.global
		this.isDragging = true
		this.lastPointer.copyFrom(global)
		this.cursor = 'grabbing'
	}

	#onPointerUp = () => {
		this.isDragging = false
		this.cursor = 'default'
	}

	#onPointerMove = (e: FederatedPointerEvent) => {
		if (!this.isDragging) return

		const dx = e.global.x - this.lastPointer.x
		const dy = e.global.y - this.lastPointer.y

		this.x += dx
		this.y += dy
		this.lastPointer.copyFrom(e.global)
		this.#refresh()
	}

	#refresh() {
		this.wireframe.draw(this.getBounds().rectangle)
	}

}
