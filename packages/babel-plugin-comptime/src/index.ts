import type { NodePath, PluginObj } from "@babel/core"
import { evaluateExpressionNode } from "js-comptime/dist/evaluateExpressionNode.js"
import { EvaluationContext } from "js-comptime/dist/EvaluationContext.js"
import { serialize } from "seroval"

// const { default: generate } = BabelGenerator as any as { default: typeof BabelGenerator }
// const { default: traverse } = BabelTraverse as any as { default: typeof BabelTraverse }

export const babelPluginComptime = (): PluginObj => ({
	name: "babel-plugin-comptime",
	visitor: {
		Program(path) {
			type ComptimeEvaluationContext = { bindings: Map<string, { value: unknown, readonly: boolean }>[] }
			const context: ComptimeEvaluationContext = { bindings: [new Map] }

			for (const childPath of path.get(`body`))
				evaluateComptime(childPath, context)

			function evaluateComptime(path: NodePath, context: ComptimeEvaluationContext): boolean {
				if (path.isVariableDeclaration()) {
					const { kind } = path.node

					for (const declarationPath of path.get(`declarations`)) {
						const idPath = declarationPath.get(`id`)

						if (!idPath.isIdentifier())
							throw Error(`${HERE} TODO ${idPath.type}`)

						const initPath = declarationPath.get(`init`)

						if (initPath.hasNode()) {
							const initIsComptime = evaluateComptime(initPath, context)

							if (kind == `const` && initIsComptime) {
								const value = evaluateExpressionNode(initPath.node, EvaluationContext({ bindings: context.bindings }))

								context.bindings[0]!.set(idPath.node.name, { value, readonly: true })
							}
						}
					}

					return false
				}

				if (path.isStringLiteral() || path.isNumericLiteral())
					return true

				if (path.isIdentifier())
					return context.bindings.some(map => map.has(path.node.name))

				let isComptime = true
				const comptimeChildPaths: NodePath[] = []

				if (path.isExportDefaultDeclaration())
					checkPath(path.get(`declaration`))
				else if (path.isExportNamedDeclaration()) {
					const declarationPath = path.get(`declaration`)

					if (declarationPath.hasNode())
						checkPath(declarationPath)
				} else if (path.isFunctionDeclaration()) {
					for (const paramPath of path.get(`params`)) {
						if (paramPath.isPattern())
							checkPath(paramPath)
					}

					checkPath(path.get(`body`))
				} else if (path.isBlockStatement()) {
					for (const statementPath of path.get(`body`))
						checkPath(statementPath)
				} else if (path.isExpressionStatement())
					checkPath(path.get(`expression`))
				else if (path.isCallExpression()) {
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
				} else if (path.isArrayExpression()) {
					for (const elementPath of path.get(`elements`)) {
						if (elementPath.hasNode())
							checkPath(elementPath)
					}
				} else if (path.isReturnStatement()) {
					const argumentPath = path.get(`argument`)

					if (argumentPath.hasNode())
						checkPath(argumentPath)
				} else if (path.isArrowFunctionExpression()) {
					for (const paramPath of path.get(`params`)) {
						if (paramPath.isPattern())
							checkPath(paramPath)
					}

					checkPath(path.get(`body`))
				} else
					throw Error(`${HERE} ${path.type}`)

				console.debug(path.node.type, isComptime)

				if (isComptime && path.isExpression())
					return true

				for (const path of comptimeChildPaths) {
					path.replaceWithSourceString(
						serialize(
							evaluateExpressionNode(path.node as any, EvaluationContext({ bindings: context.bindings }))
						)
					)
				}

				return isComptime

				function checkPath(path: NodePath) {
					if (evaluateComptime(path, context)) {
						if (path.isExpression())
							comptimeChildPaths.push(path)
					} else
						isComptime = false
				}
			}
		}
	}
})

export { babelPluginComptime as comptime, babelPluginComptime as default }
