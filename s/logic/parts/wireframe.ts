import {Graphics, Rectangle} from 'pixi.js'

export class Wireframe extends Graphics {

  constructor() {
    super()
		this.eventMode = 'static'
		this.cursor = 'move'
  }

	draw(bounds: Rectangle, scale = 1) {
		const color = 0x55c1ff

		this.clear()
		this.setStrokeStyle({width: scale, color})
			.rect(bounds.x, bounds.y, bounds.width, bounds.height)
			.stroke()

		this.hitArea = bounds
	}
}
