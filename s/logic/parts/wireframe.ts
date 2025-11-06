import {Graphics, Rectangle} from 'pixi.js'

import {Kimura} from '../kimura.js'

export class Wireframe extends Graphics {
	constructor(private kimura: Kimura) {
		super()
	}

	draw(bounds: Rectangle) {
		const color = 0x55c1ff
		const thickness = 1

		this.clear()
		this.setStrokeStyle({ width: thickness, color })
			.rect(bounds.x, bounds.y, bounds.width, bounds.height)
			.stroke()

		this.hitArea = bounds
	}
}
