#!node_modules/.bin/rollup --config
import { babel } from "@rollup/plugin-babel"
import { babelPluginComptime } from "../dist/index.js"
import Path from "path"

export default /** @satisfies {import("rollup").RollupOptions} */ ({
	input: Path.resolve(import.meta.dirname, "input.js"),
	output: { file: Path.resolve(import.meta.dirname, "output.js") },
	plugins: [
		babel({
			babelHelpers: "bundled",
			plugins: [ babelPluginComptime() ]
		})
	]
})