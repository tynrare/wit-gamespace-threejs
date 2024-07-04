import plugin_pug from "vite-plugin-pug"

/** @type {import('vite').UserConfig} */
export default {
	publicDir: "res",
	plugins: [plugin_pug({ pretty: false }, { name: "witgs-threejs" })]
	//...
}
