import {
	Container,
	Point,
	FederatedPointerEvent,
	Rectangle,
	Matrix,
	Ticker
} from 'pixi.js'

import {Wireframe} from './parts/wireframe.js'
import {Corner, Handle} from './parts/handle.js'

const TMP = {
	delta: new Matrix(),
	newLocal: new Matrix()
}

export class Kimura extends Container {
	group: Container[]
	wireframe = new Wireframe()
	activeHandle: string | null = null
	isDragging = false
	lastPointer = new Point()
	activeTarget: Container | null = null

	#handles: Record<string, Handle>
	#childStart = new Map<Container, Matrix>()
	#opBounds = new Rectangle()
	#pivot = new Point()
	#startAngle = 0
	#angle = 0

	constructor(opts: {group: Container[]}) {
		super()
		this.group = opts.group
		this.eventMode = 'static'

		const callbacks = {
			beginDrag: (corner: Corner, start: Point) => this.#beginHandleDrag(corner, start),
			updateDrag: (corner: Corner, pos: Point) => this.#scale(corner, pos),
			endDrag: () => this.#endDrag()
		}

		this.#handles = {
			tl: new Handle('tl', 'nwse-resize', callbacks),
			tr: new Handle('tr', 'nesw-resize', callbacks),
			bl: new Handle('bl', 'nesw-resize', callbacks),
			br: new Handle('br', 'nwse-resize', callbacks),
			rot: new Handle('rot', 'crosshair', {
				beginDrag: (_corner, start) => this.#beginRotateDrag(start),
				updateDrag: (_corner, pos) => this.#rotate(pos),
				endDrag: () => this.#endDrag()
			})
		}

		this.addChild(this.wireframe)
		for (const h of Object.values(this.#handles)) this.addChild(h)

		this.#bindEvents()
		Ticker.shared.addOnce(() => this.#refresh())
	}

	#bindEvents() {
		this.on('pointerdown', this.#onPointerDown)
		this.on('pointerup', this.#onPointerUp)
		this.on('pointerupoutside', this.#onPointerUp)
		this.on('globalpointermove', this.#onPointerMove)
	}

	#onPointerDown = (e: FederatedPointerEvent) => {
		this.isDragging = true
		this.lastPointer.copyFrom(e.global)
		this.cursor = 'grabbing'
	}

	#onPointerUp = () => {
		this.isDragging = false
		this.activeHandle = null
		this.cursor = 'default'
	}

	#onPointerMove = (e: FederatedPointerEvent) => {
		if (!this.isDragging || !this.parent) return
		for (const obj of this.group) {
			const parent = obj.parent
			if (!parent) continue
			const localStart = parent.toLocal(this.lastPointer)
			const localNow = parent.toLocal(e.global)
			obj.position.x += localNow.x - localStart.x
			obj.position.y += localNow.y - localStart.y
		}
		this.lastPointer.copyFrom(e.global)
		this.#refresh()
	}

	#beginHandleDrag(corner: Corner, _start: Point) {
		this.isDragging = true
		this.#childStart.clear()
		for (const c of this.group) this.#childStart.set(c, c.localTransform.clone())
		if (this.parent) this.position.copyFrom(this.parent.toLocal(this.#pivot))
		this.rotation = this.#angle
		const ob = this.#computeOrientedLocalBounds()
		this.#opBounds.set(0, 0, ob.width, ob.height)
		const px = corner.includes('l') ? ob.x + ob.width : ob.x
		const py = corner.includes('t') ? ob.y + ob.height : ob.y
		const pivotWorld = this.toGlobal(new Point(px, py))
		this.#pivot.copyFrom(pivotWorld)
	}

	#scale(corner: Corner, global: Point) {
    const p = this.toLocal(global)
      
    const newW = corner.includes('l') ? -p.x : p.x
    const newH = corner.includes('t') ? -p.y : p.y
    
    const scaleX = this.#opBounds.width ? newW / this.#opBounds.width : 1
    const scaleY = this.#opBounds.height ? newH / this.#opBounds.height : 1
    
    const pivotWorld = this.#pivot
    const angle = this.#angle

    for (const c of this.group) {
      const start = this.#childStart.get(c)!
      const parent = c.parent
      if (!parent) continue
      const parentInv = parent.worldTransform.clone().invert()

      // We must rotate, scale, and rotate back around the pivot
      const worldDelta = TMP.delta.identity()
        .translate(-pivotWorld.x, -pivotWorld.y) // 1. Move pivot to origin
        .rotate(-angle)                          // 2. Un-rotate to align with world axes
        .scale(scaleX, scaleY)                   // 3. Scale along aligned axes
        .rotate(angle)                           // 4. Re-rotate to original angle
        .translate(pivotWorld.x, pivotWorld.y)   // 5. Move pivot back

      const startWorld = start.clone().append(parent.worldTransform)
      const newWorld = worldDelta.clone().append(startWorld)
      const newLocal = parentInv.clone().append(newWorld)
      c.setFromMatrix(newLocal)
    }

    this.#refresh()
  }

	#beginRotateDrag(start: Point) {
		this.isDragging = true
		this.#childStart.clear()
		for (const c of this.group) this.#childStart.set(c, c.localTransform.clone())
		const b = this.#computeWorldAABB()
		const pivotWorld = new Point(b.x + b.width / 2, b.y + b.height / 2)
		this.#pivot.copyFrom(pivotWorld)
		const local = this.toLocal(start)
		const pivotLocal = this.toLocal(this.#pivot)
		this.#startAngle = Math.atan2(local.y - pivotLocal.y, local.x - pivotLocal.x)
	}

	#rotate(global: Point) {
		const local = this.toLocal(global)
		const pivotLocal = this.toLocal(this.#pivot)
		const current = Math.atan2(local.y - pivotLocal.y, local.x - pivotLocal.x)
		const da = current - this.#startAngle
		const liveAngle = this.#angle + da
		const pivotWorld = this.#pivot
		for (const c of this.group) {
			const start = this.#childStart.get(c)!
			const parent = c.parent
			if (!parent) continue
			const parentInv = parent.worldTransform.clone().invert()
			const worldDelta = TMP.delta.identity()
				.translate(-pivotWorld.x, -pivotWorld.y)
				.rotate(da)
				.translate(pivotWorld.x, pivotWorld.y)
			const startWorld = start.clone().append(parent.worldTransform)
			const newWorld = worldDelta.clone().append(startWorld)
			const newLocal = parentInv.clone().append(newWorld)
			c.setFromMatrix(newLocal)
		}
		if (this.parent) this.position.copyFrom(this.parent.toLocal(this.#pivot))
		this.rotation = liveAngle
		this.#refresh(liveAngle)
	}

	#endDrag() {
		this.isDragging = false
		this.#angle = this.rotation
		if (this.parent) this.position.copyFrom(this.parent.toLocal(this.#pivot))
		this.#refresh(this.#angle)
	}

	#computeWorldAABB() {
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
		for (const obj of this.group) {
			const b = obj.getBounds()
			minX = Math.min(minX, b.x)
			minY = Math.min(minY, b.y)
			maxX = Math.max(maxX, b.x + b.width)
			maxY = Math.max(maxY, b.y + b.height)
		}
		return new Rectangle(minX, minY, maxX - minX, maxY - minY)
	}

	#computeOrientedLocalBounds() {
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
		const worldToLocal = this.worldTransform.clone().invert()
		for (const obj of this.group) {
			const wt = obj.worldTransform
			const b = obj.getLocalBounds()
			const corners = [
				new Point(b.x, b.y),
				new Point(b.x + b.width, b.y),
				new Point(b.x + b.width, b.y + b.height),
				new Point(b.x, b.y + b.height)
			]
			for (const p of corners) {
				const pw = wt.apply(p)
				const pv = worldToLocal.apply(pw)
				minX = Math.min(minX, pv.x)
				minY = Math.min(minY, pv.y)
				maxX = Math.max(maxX, pv.x)
				maxY = Math.max(maxY, pv.y)
			}
		}
		return new Rectangle(minX, minY, maxX - minX, maxY - minY)
	}

	#refresh(angle: number = this.#angle) {
		if (this.parent) this.position.copyFrom(this.parent.toLocal(this.#pivot))
		this.rotation = angle
		const r = this.#computeOrientedLocalBounds()
		this.wireframe.draw(r)
		this.#handles.tl.position.set(r.x, r.y)
		this.#handles.tr.position.set(r.x + r.width, r.y)
		this.#handles.bl.position.set(r.x, r.y + r.height)
		this.#handles.br.position.set(r.x + r.width, r.y + r.height)
		const cx = r.x + r.width / 2
		this.#handles.rot.position.set(cx, r.y - 30)
	}
}
