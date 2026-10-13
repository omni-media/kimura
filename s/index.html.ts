
import {template, html, utf8, viewport, darkreaderDisable, socialCard} from "@e280/scute"

const title = "transformer"
const domain = "omnitool.omniclip.app"
const favicon = "/assets/favicon.png"

export default template(import.meta.url, async orb => html`
	<!doctype html>
	<html>
	<head>
		${utf8()}
		${viewport()}
		${darkreaderDisable()}
		<title>${title}</title>
		<style>${await orb.inject("demo/demo.css")}</style>
		<script type="module" src="${orb.hashurl("demo/demo.bundle.min.js")}"></script>
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Share+Tech&display=swap" rel="stylesheet">
		${socialCard({
		title,
		description: "transformer library for pixijs",
		themeColor: "#3cff9c",
		siteName: domain,
		image: `https://${domain}${favicon}`,
		})}
	</head>
	<body>
		<section>
			<h1>Kimura <small>v${orb.packageVersion()}</small></h1>
		</section>
	</body>
	</html>
`)
