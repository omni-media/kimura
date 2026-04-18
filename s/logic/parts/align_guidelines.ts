
import {Keys} from './util.js'

import {Kimura} from '../kimura.js'
import {Container, ContainerChild, FederatedPointerEvent, Graphics, Matrix, Point} from 'pixi.js'

type VerticalLineCoords = {
	x: number
	y1: number
	y2: number
}

type HorizontalLineCoords = {
	y: number
	x1: number
	x2: number
}

type IgnoreObjTypes = {
	key: string
	value: any
}[]

type ACoordsAppendCenter = {
	tl: Point
	tr: Point
	bl: Point
	br: Point
	c: Point
}

export class AlignGuidelines {
	aligningLineMargin = 30
	aligningLineWidth = 6
	aligningLineColor = '#F68066'
	ignoreObjTypes: IgnoreObjTypes = []
	pickObjTypes: IgnoreObjTypes = []
	stage: Container<ContainerChild>
	kimura: Kimura

	verticalLines: VerticalLineCoords[] = []
	horizontalLines: HorizontalLineCoords[] = []

	graphics = new Graphics() // graphics for align guidelines

	constructor({
		stage,
		kimura,
		aligningOptions,
		ignoreObjTypes,
		pickObjTypes,
	}: {
		stage: Container<ContainerChild>
		kimura: Kimura
		ignoreObjTypes?: IgnoreObjTypes
		pickObjTypes?: IgnoreObjTypes
		aligningOptions?: {
			lineMargin?: number
			lineWidth?: number
			lineColor?: string
		}
	}) {
		this.stage = stage
		this.kimura = kimura
		this.ignoreObjTypes = ignoreObjTypes || []
		this.pickObjTypes = pickObjTypes || []
		this.graphics.zIndex = 1000
		this.graphics.eventMode = 'none'
		this.stage.addChild(this.graphics)
		this.stage.sortableChildren = true

		if (aligningOptions) {
			this.aligningLineMargin = aligningOptions.lineMargin || this.aligningLineMargin
			this.aligningLineWidth = aligningOptions.lineWidth || this.aligningLineWidth
			this.aligningLineColor = aligningOptions.lineColor || this.aligningLineColor
		}
	}

	private drawSign(x: number, y: number) {
		const color = parseInt(this.aligningLineColor.replace('#', '0x'))
		const size = 2
		this.graphics
			.setStrokeStyle({width: this.aligningLineWidth, color, alpha: 1})
			.moveTo(x - size, y - size)
			.lineTo(x + size, y + size)
			.moveTo(x + size, y - size)
			.lineTo(x - size, y + size)
			.stroke()
	}

	private drawLine(x1: number, y1: number, x2: number, y2: number) {
		const strokeColor = parseInt(this.aligningLineColor.replace('#', '0x'))

		this.graphics
			.setStrokeStyle({width: this.aligningLineWidth, color: strokeColor, alpha: 1})
			.moveTo(x1, y1)
			.lineTo(x2, y2)
			.stroke()
		this.drawSign(x1, y1)
		this.drawSign(x2, y2)
	}

	private drawVerticalLine(coords: VerticalLineCoords) {
		this.drawLine(coords.x, Math.min(coords.y1, coords.y2), coords.x, Math.max(coords.y1, coords.y2))
	}

	private drawHorizontalLine(coords: HorizontalLineCoords) {
		this.drawLine(Math.min(coords.x1, coords.x2), coords.y, Math.max(coords.x1, coords.x2), coords.y)
	}

	private isInRange(value1: number, value2: number) {
		const zoom = this.stage.scale.x || 1
		return Math.abs(Math.round(value1) - Math.round(value2)) <= this.aligningLineMargin / zoom
	}

	private watchMouseDown() {
		this.stage.on('pointerdown', () => {
			this.clearLinesMeta()
		})
	}

	private watchMouseUp() {
		const clear = () => this.reset()
		this.stage.on('pointerup', clear)
		this.stage.on('pointerupoutside', clear)
	}

	private watchMouseWheel() {
		this.stage.addEventListener('wheel', () => {
			this.clearLinesMeta()
		})
	}

	private clearLinesMeta() {
		this.verticalLines.length = this.horizontalLines.length = 0
	}

	on_object_move_or_scale(e: FederatedPointerEvent) {
		this.clearLinesMeta()
		this.clearGuideline()

		const activeObject = this.kimura.activeObject
		if (!activeObject) return

		const canvasObjects = this.stage.children.filter(obj => {
			if (obj === activeObject) return false
			if (obj === this.kimura) return false
			if (obj === this.graphics) return false

			if (this.ignoreObjTypes.length) {
				return !this.ignoreObjTypes.some(item => (obj as any)[item.key] === item.value)
			}
			if (this.pickObjTypes.length) {
				return this.pickObjTypes.some(item => (obj as any)[item.key] === item.value)
			}
			return true
		})

		this.traversAllObjects(activeObject, canvasObjects)
	}

	private getObjDraggingObjCoords(activeObject: Container): ACoordsAppendCenter {
		const bounds = activeObject.getBounds()
		const aCoords = {
			tl: new Point(bounds.x, bounds.y),
			tr: new Point(bounds.x + bounds.width, bounds.y),
			bl: new Point(bounds.x, bounds.y + bounds.height),
			br: new Point(bounds.x + bounds.width, bounds.y + bounds.height),
		}

		const centerPoint = new Point((aCoords.tl.x + aCoords.br.x) / 2, (aCoords.tl.y + aCoords.br.y) / 2)
		const computedCenter = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)

		const offsetX = centerPoint.x - computedCenter.x
		const offsetY = centerPoint.y - computedCenter.y

		return Object.keys(aCoords).reduce((acc, k) => {
			const key = k as keyof typeof aCoords
			acc[key] = new Point(aCoords[key].x - offsetX, aCoords[key].y - offsetY)
			return acc
		}, {c: computedCenter} as ACoordsAppendCenter)
	}

	private omitCoords(objCoords: ACoordsAppendCenter, type: 'vertical' | 'horizontal') {
		let newCoords
		type PointArr = [keyof ACoordsAppendCenter, Point]

		if (type === 'vertical') {
			let l: PointArr = ['tl', objCoords.tl]
			let r: PointArr = ['tl', objCoords.tl]

			Keys(objCoords).forEach(key => {
				if (objCoords[key].x < l[1].x) {
					l = [key, objCoords[key]]
				}
				if (objCoords[key].x > r[1].x) {
					r = [key, objCoords[key]]
				}
			})

			newCoords = {
				[l[0]]: l[1],
				[r[0]]: r[1],
				c: objCoords.c,
			} as ACoordsAppendCenter
		} else {
			let t: PointArr = ['tl', objCoords.tl]
			let b: PointArr = ['tl', objCoords.tl]

			Keys(objCoords).forEach(key => {
				if (objCoords[key].y < t[1].y) {
					t = [key, objCoords[key]]
				}
				if (objCoords[key].y > b[1].y) {
					b = [key, objCoords[key]]
				}
			})

			newCoords = {
				[t[0]]: t[1],
				[b[0]]: b[1],
				c: objCoords.c,
			} as ACoordsAppendCenter
		}

		return newCoords
	}

	private getObjMaxWidthHeightByCoords(coords: ACoordsAppendCenter) {
		const objHeight = Math.max(Math.abs(coords.c.y - coords['tl'].y), Math.abs(coords.c.y - coords['tr'].y)) * 2
		const objWidth = Math.max(Math.abs(coords.c.x - coords['tl'].x), Math.abs(coords.c.x - coords['tr'].x)) * 2
		return {objHeight, objWidth}
	}

	private traversAllObjects(activeObject: Container, canvasObjects: Container[]) {
		const objCoordsByMovingDistance = this.getObjDraggingObjCoords(activeObject)
		let snapXPoint: number | null = null
		let snapYPoint: number | null = null
		let bestVerticalLine: VerticalLineCoords | null = null
		let bestHorizontalLine: HorizontalLineCoords | null = null
		let bestXDistance = Infinity
		let bestYDistance = Infinity

		const considerVerticalSnap = (centerX: number, x: number, y1: number, y2: number, distance: number) => {
			if (distance <= this.aligningLineMargin && distance < bestXDistance) {
				bestXDistance = distance
				snapXPoint = centerX
				bestVerticalLine = {x, y1, y2}
			}
		}

		const considerHorizontalSnap = (centerY: number, y: number, x1: number, x2: number, distance: number) => {
			if (distance <= this.aligningLineMargin && distance < bestYDistance) {
				bestYDistance = distance
				snapYPoint = centerY
				bestHorizontalLine = {y, x1, x2}
			}
		}

		for (let i = canvasObjects.length; i--; ) {
			if (canvasObjects[i] === activeObject) continue

			const objCoords = this.getObjDraggingObjCoords(canvasObjects[i])
			const {objWidth, objHeight} = this.getObjMaxWidthHeightByCoords(objCoords)

			Object.keys(objCoordsByMovingDistance).forEach(point => {
				const newCoords = (canvasObjects[i] as any).rotation !== 0
					? this.omitCoords(objCoords, 'horizontal')
					: objCoords

				function calcHorizontalLineCoords(
					objPoint: keyof ACoordsAppendCenter,
					activeObjCoords: ACoordsAppendCenter
				) {
					const activeObjPoint = point as keyof ACoordsAppendCenter
					let x1: number
					let x2: number

					if (objPoint === 'c') {
						x1 = Math.min(objCoords.c.x - objWidth / 2, activeObjCoords[activeObjPoint].x)
						x2 = Math.max(objCoords.c.x + objWidth / 2, activeObjCoords[activeObjPoint].x)
					} else {
						x1 = Math.min(objCoords[objPoint].x, activeObjCoords[activeObjPoint].x)
						x2 = Math.max(objCoords[objPoint].x, activeObjCoords[activeObjPoint].x)
					}

					return {x1, x2}
				}

				Object.keys(newCoords).forEach(objp => {
					const objPoint = objp as keyof typeof newCoords
					const activeObjPoint = point as keyof ACoordsAppendCenter

					if (this.isInRange(objCoordsByMovingDistance[activeObjPoint].y, newCoords[objPoint].y)) {
						const y = newCoords[objPoint].y
						const {x1, x2} = calcHorizontalLineCoords(objPoint as keyof ACoordsAppendCenter, objCoordsByMovingDistance)
						const offset = objCoordsByMovingDistance[activeObjPoint].y - y
						const centerY = objCoordsByMovingDistance.c.y - offset
						const distance = Math.abs(objCoordsByMovingDistance[activeObjPoint].y - y)

						considerHorizontalSnap(centerY, y, x1, x2, distance)
					}
				})
			})

			Object.keys(objCoordsByMovingDistance).forEach(activePoint => {
				const activeObjPoint = activePoint as keyof ACoordsAppendCenter
				const newCoords = (canvasObjects[i] as any).rotation !== 0
					? this.omitCoords(objCoords, 'vertical')
					: objCoords

				function calcVerticalLineCoords(
					objPoint: keyof ACoordsAppendCenter,
					activeObjCoords: ACoordsAppendCenter
				) {
					let y1: number
					let y2: number

					if (objPoint === 'c') {
						y1 = Math.min(newCoords.c.y - objHeight / 2, activeObjCoords[activeObjPoint].y)
						y2 = Math.max(newCoords.c.y + objHeight / 2, activeObjCoords[activeObjPoint].y)
					} else {
						y1 = Math.min(objCoords[objPoint].y, activeObjCoords[activeObjPoint].y)
						y2 = Math.max(objCoords[objPoint].y, activeObjCoords[activeObjPoint].y)
					}

					return {y1, y2}
				}

				Object.keys(newCoords).forEach(objp => {
					const objPoint = objp as keyof typeof newCoords

					if (this.isInRange(objCoordsByMovingDistance[activeObjPoint].x, newCoords[objPoint].x)) {
						const x = newCoords[objPoint].x
						const {y1, y2} = calcVerticalLineCoords(objPoint as keyof ACoordsAppendCenter, objCoordsByMovingDistance)
						const offset = objCoordsByMovingDistance[activeObjPoint].x - x
						const centerX = objCoordsByMovingDistance.c.x - offset
						const distance = Math.abs(objCoordsByMovingDistance[activeObjPoint].x - x)

						considerVerticalSnap(centerX, x, y1, y2, distance)
					}
				})
			})
		}

		const stageWidth = this.kimura.stageWidth
		const stageHeight = this.kimura.stageHeight
		const activeCoords = objCoordsByMovingDistance
		const xTargets = [0, stageWidth / 2, stageWidth]
		const yTargets = [0, stageHeight / 2, stageHeight]
		const activeKeys = Object.keys(activeCoords) as (keyof ACoordsAppendCenter)[]

		for (const key of activeKeys) {
			const pt = activeCoords[key]

			for (const targetX of xTargets) {
				if (this.isInRange(pt.x, targetX)) {
					considerVerticalSnap(
						activeCoords.c.x - (pt.x - targetX),
						targetX,
						Math.min(pt.y, 0),
						Math.max(pt.y, stageHeight),
						Math.abs(pt.x - targetX),
					)
				}
			}

			for (const targetY of yTargets) {
				if (this.isInRange(pt.y, targetY)) {
					considerHorizontalSnap(
						activeCoords.c.y - (pt.y - targetY),
						targetY,
						Math.min(pt.x, 0),
						Math.max(pt.x, stageWidth),
						Math.abs(pt.y - targetY),
					)
				}
			}
		}

		if (bestVerticalLine)
			this.verticalLines.push(bestVerticalLine)

		if (bestHorizontalLine)
			this.horizontalLines.push(bestHorizontalLine)

		this.snap({activeObject, draggingObjCoords: objCoordsByMovingDistance, snapXPoint, snapYPoint})
	}

	private snap({
		activeObject,
		snapXPoint,
		draggingObjCoords,
		snapYPoint,
	}: {
		activeObject: Container
		snapXPoint: number | null
		draggingObjCoords: ACoordsAppendCenter
		snapYPoint: number | null
	}) {
		const currentCenter = draggingObjCoords.c

		const candidateSnapGlobal = new Point(
			snapXPoint ?? currentCenter.x,
			snapYPoint ?? currentCenter.y
		)

		const dx = candidateSnapGlobal.x - currentCenter.x
		const dy = candidateSnapGlobal.y - currentCenter.y

		if (dx === 0 && dy === 0) return

		const delta = new Matrix().translate(dx, dy)

		if (this.kimura.isDragging) {
			this.kimura.applyWorldDelta(delta)
			this.kimura.lastPointer.x += dx
			this.kimura.lastPointer.y += dy
			return
		}

		const parent = activeObject.parent
		if (!parent) return

		const parentWorld = parent.worldTransform
		const parentInv = parentWorld.clone().invert()

		const startLocal = activeObject.localTransform.clone()
		const startWorld = startLocal.clone().append(parentWorld)

		const newWorld = delta.clone().append(startWorld)
		const newLocal = parentInv.clone().append(newWorld)

		activeObject.setFromMatrix(newLocal)
	}

	clearGuideline() {
		this.graphics.clear()
	}

	reset() {
		this.clearLinesMeta()
		this.clearGuideline()
	}

	render() {
		for (let i = this.verticalLines.length; i--; ) {
			this.drawVerticalLine(this.verticalLines[i])
		}
		for (let i = this.horizontalLines.length; i--; ) {
			this.drawHorizontalLine(this.horizontalLines[i])
		}
	}

	init() {
		this.watchMouseDown()
		this.watchMouseUp()
		this.watchMouseWheel()
	}
}
