import type { PluginObj } from "@babel/core"
import * as t from "@babel/types"
import { assert, ensure } from "@samual/lib/assert"
import { isExpression } from "@babel/types"
import { type Context, run } from "@samual/jsi"
import { serialize } from "seroval"

const context: Context = {
	variables: Object.create(globalThis),
	constants: Object.create(null),
	statementLabel: undefined,
	callSuper: undefined,
	getSuperProperty: undefined,
	signal: undefined,
	this: undefined
}

export const babelPluginComptime = (): PluginObj => ({
	name: "babel-plugin-comptime",
	visitor: {
		Program(path) {
			if (!path.scope.hasGlobal("comptime$"))
				return

			const [ variableDeclarationPath ] = path.unshiftContainer(
				"body",
				t.variableDeclaration("let", [ t.variableDeclarator(t.identifier("comptime$")) ])
			)

			path.scope.crawl()

			for (const referencePath of ensure(path.scope.getBinding("comptime$"), HERE).referencePaths) {
				assert(referencePath.parent.type == `CallExpression`, HERE)
				assert(referencePath.parent.arguments.length == 1, HERE)

				const argument = referencePath.parent.arguments[0]
				
				assert(isExpression(argument), HERE)
				referencePath.parentPath!.replaceWithSourceString(serialize(run(argument, context)))
			}

			variableDeclarationPath.remove()
		}
	}
})

export { babelPluginComptime as comptime, babelPluginComptime as default }
