import type { NodePath, PluginObj } from "@babel/core"
import { evaluateExpressionNode } from "js-comptime/dist/evaluateExpressionNode.js"
import { EvaluationContext } from "js-comptime/dist/EvaluationContext"
import { serialize } from "seroval"

// const { default: generate } = BabelGenerator as any as { default: typeof BabelGenerator }
// const { default: traverse } = BabelTraverse as any as { default: typeof BabelTraverse }

export const babelPluginComptime = (): PluginObj => ({
	name: "babel-plugin-comptime",
	visitor: {
		Program(path) {
			for (const childPath of path.get(`body`))
				evaluateComptime(childPath)

			function evaluateComptime(path: NodePath): boolean {
				if (path.isExportDefaultDeclaration()) {
					evaluateComptime(path.get(`declaration`))

					return false
				}

				if (path.isVariableDeclaration()) {
					const { kind } = path.node

					if (kind == `const`) {
						for (const declarationPath of path.get(`declarations`)) {
							const initPath = declarationPath.get(`init`)

							if (initPath.hasNode())
								evaluateComptime(initPath)
						}
					}

					return false
				}

				if (path.isExportNamedDeclaration()) {
					const declarationPath = path.get(`declaration`)

					if (declarationPath.hasNode())
						evaluateComptime(declarationPath)

					return false
				}

				if (path.isFunctionDeclaration()) {
					for (const paramPath of path.get(`params`)) {
						if (paramPath.isPattern())
							evaluateComptime(paramPath)
					}

					evaluateComptime(path.get(`body`))

					return false
				}

				if (path.isBlockStatement()) {
					for (const statementPath of path.get(`body`))
						evaluateComptime(statementPath)

					return false
				}

				if (path.isReturnStatement()) {
					const argumentPath = path.get(`argument`)

					if (argumentPath.hasNode())
						evaluateComptime(argumentPath)

					return false
				}

				if (path.isStringLiteral() || path.isNumericLiteral())
					return true

				if (path.isIdentifier())
					return false

				if (path.isExpressionStatement()) {
					if (evaluateComptime(path.get(`expression`)))
						path.remove()

					return false
				}

				let isComptime = true
				const comptimeChildPaths: NodePath[] = []

				if (path.isCallExpression()) {
					checkPath(path.get(`callee`))

					for (const argumentPath of path.get(`arguments`))
						checkPath(argumentPath)
				} else if (path.isBinaryExpression()) {
					checkPath(path.get(`left`))
					checkPath(path.get(`right`))
				} else if (path.isMemberExpression()) {
					checkPath(path.get(`object`))

					if (path.node.computed)
						checkPath(path.get(`property`))
				} else
					throw Error(`${HERE} ${path.type}`)


				if (isComptime)
					return true

				for (const path of comptimeChildPaths) {
					const context: EvaluationContext = {
						bindings: [],
						this: undefined,
						signal: undefined,
						callSuper: undefined,
						statementLabel: undefined,
						getSuperProperty: undefined,
						callSuperProperty: undefined
					}

					path.replaceWithSourceString(serialize(evaluateExpressionNode(path.node as any, context)))
				}

				return false

				function checkPath(path: NodePath) {
					if (evaluateComptime(path))
						comptimeChildPaths.push(path)
					else
						isComptime = false
				}
			}
		}
	}
})

export { babelPluginComptime as comptime, babelPluginComptime as default }
