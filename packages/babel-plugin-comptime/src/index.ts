import type { PluginObj } from "@babel/core"
import type { EvaluationContext } from "js-comptime/dist/EvaluationContext.js"
import { hoist } from "js-comptime/dist/hoist.js"
import { transformStatementNode } from "js-comptime/dist/transformStatementNode.js"
import BabelTraverse from "@babel/traverse"
import { assert } from "@samual/lib/assert"
import { makeFunction } from "js-comptime/dist/makeFunction.js"
import { scopeEvaluationContext } from "js-comptime/dist/EvaluationContext.js"
import { evaluateExpressionNode } from "js-comptime/dist/evaluateExpressionNode.js"
import { serialize } from "seroval"
import BabelGenerator from "@babel/generator"

const { default: generate } = BabelGenerator as any as { default: typeof BabelGenerator }
const { default: traverse } = BabelTraverse as any as { default: typeof BabelTraverse }

export const babelPluginComptime = (): PluginObj => ({
	name: "babel-plugin-comptime",
	visitor: {
		Program(path) {
			const context: EvaluationContext = {
				variables: Object.create(globalThis),
				constants: Object.create(null),
				statementLabel: undefined,
				callSuper: undefined,
				getSuperProperty: undefined,
				signal: undefined,
				this: undefined,
				callSuperProperty: undefined
			}

			hoist(path.node.body, context)

			traverse(path.node, {
				enter(path) {
					if (path.node.leadingComments?.some(comment => comment.value.includes(`@comptime`))) {
						// Object.entries(path.scope.bindings).map(([ name, binding ]) => {
						// 	assert(binding.path.node.type == `FunctionDeclaration`, HERE)

						// 	return [ name, makeFunction(binding.path.node, context) ]
						// })

						// console.debug(HERE, generate(path.node))

						delete path.node.leadingComments

						path.replaceWithSourceString(serialize(evaluateExpressionNode(path.node, context)))



						// path.replaceWithSourceString

						// console.log(path.scope.bindings.add?.identifier)
					}
				}
			})

			// hoist(path.node.body, context)

			// for (const node of path.node.body) {
			// 	if (node.type == `ExportDefaultDeclaration` && node.declaration.type == `StringLiteral` && node.declaration.value == `__ROLLUP__PREFLIGHT_CHECK_DO_NOT_TOUCH__`)
			// 		continue

			// 	transformStatementNode(node, context)
			// }

			// path.get()

			// if (!path.scope.hasGlobal("comptime$"))
			// 	return

			// const [ variableDeclarationPath ] = path.unshiftContainer(
			// 	"body",
			// 	t.variableDeclaration("let", [ t.variableDeclarator(t.identifier("comptime$")) ])
			// )

			// path.scope.crawl()

			// for (const referencePath of ensure(path.scope.getBinding("comptime$"), HERE).referencePaths) {
			// 	assert(referencePath.parent.type == `CallExpression`, HERE)
			// 	assert(referencePath.parent.arguments.length == 1, HERE)

			// 	const argument = referencePath.parent.arguments[0]

			// 	assert(isExpression(argument), HERE)
			// 	referencePath.parentPath!.replaceWithSourceString(serialize(run(argument, context)))
			// }

			// variableDeclarationPath.remove()
		}
	}
})

export { babelPluginComptime as comptime, babelPluginComptime as default }
