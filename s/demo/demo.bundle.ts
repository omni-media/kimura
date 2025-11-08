import {Application, Graphics} from "pixi.js"

import {Kimura} from "../logic/kimura.js"

const app = new Application()

await app.init({
    autoDensity: true,
    backgroundColor: 0xabcdef,
    width: 1024,
    height: 1024,
    antialias: true,
    view: document.createElement('canvas') ,
})
document.body.appendChild(app.canvas)

const a = app.stage.addChild(new Graphics())
a.circle(0, 0, 100)
    .fill(0xfedbac)

const b = app.stage.addChild(new Graphics())
b.circle(0, 0, 100)
    .fill(0xfedbac)

b.position.set(600, 300)
a.position.set(300, 300)

app.stage.addChild(new Kimura({
    group: [b, a],
}))

