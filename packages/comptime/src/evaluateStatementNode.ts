import type { ClassMethod as ClassMethodNode, Expression as ExpressionNode, Identifier as IdentifierNode, Pattern as PatternNode, RestElement as RestElementNode, Statement as StatementNode, TSParameterProperty as TSParameterPropertyNode } from "@babel/types"
import * as Babel from "@babel/types"
import { assert } from "@samual/lib/assert"
import { scopeEvaluationContext, type EvaluationContext } from "./EvaluationContext"
import { EvaluationContextSignalTag } from "./EvaluationContextSignalTag"
import { evaluateExpressionNode } from "./evaluateExpressionNode"
import { makeFunction } from "./makeFunction"
import { hoist } from "./hoist"

export function evaluateStatementNode(node: StatementNode, context: EvaluationContext): void {
	const { type } = node

	if (type == `BlockStatement`) {
		const blockScope = scopeEvaluationContext(context)

		hoist(node.body, blockScope)

		for (const childNode of node.body) {
			evaluateStatementNode(childNode, blockScope)

			if (blockScope.signal) {
				context.signal = blockScope.signal

				return
			}
		}

		return
	}

	if (type == `BreakStatement`) {
		context.signal = { tag: EvaluationContextSignalTag.Break, label: node.label?.name } as const

		return
	}

	if (type == `ClassDeclaration`) {
		assert(node.id, HERE)

		const propertyDefinitions = new Map<string, ExpressionNode>()
		let constructorNode: ClassMethodNode | undefined

		const { superClass, id, body } = node

		const constructor = ({
			[id.name]: class extends (superClass ? evaluateExpressionNode(superClass, context) as any : Object) {
				constructor(...args: unknown[]) {
					if (!constructorNode) {
						// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
						const this_: any = super(...args)

						for (const [ name, value ] of propertyDefinitions)
							this_[name] = evaluateExpressionNode(value, context)

						return
					}

					const constructorScope = scopeEvaluationContext(context)

					constructorScope.this = undefined

					constructorScope.callSuper = (...args: any[]) => {
						// @ts-expect-error -- not supposed to use `super()` here
						constructorScope.this = super(...args)

						for (const [ name, valueNode ] of propertyDefinitions)
							(constructorScope.this as any)[name] = evaluateExpressionNode(valueNode, context)

						return constructorScope.this
					}

					if (superClass)
						constructorScope.getSuperProperty = name => super[name as any]
					else
						constructorScope.callSuper([])

					for (let index = 0; index < constructorNode.params.length; index++) {
						const childNode: IdentifierNode | PatternNode | RestElementNode | TSParameterPropertyNode =
							constructorNode.params[index]!

						if (childNode.type == `Identifier`)
							constructorScope.variables[childNode.name] = args[index]
						else if (childNode.type == `AssignmentPattern`) {
							assert(childNode.left.type == `Identifier`, `${HERE} ${childNode.left.type}`)

							constructorScope.variables[childNode.left.name] = args[index] === undefined
								? evaluateExpressionNode(childNode.right, context)
								: args[index]
						} else
							throw Error(`${HERE} ${childNode.type}`)
					}

					evaluateStatementNode(constructorNode.body, constructorScope)

					if (context.signal && context.signal.tag == EvaluationContextSignalTag.Return) {
						const { value } = context.signal

						context.signal = undefined

						return value as any
					}
				}

				getGetSuperProperty() {
					return (name: unknown) => super[name as any]
				}
			}
		})[id.name]!

		const constructorContext: EvaluationContext = {
			...context,
			getSuperProperty: constructor.prototype.getGetSuperProperty()
		}

		delete (constructor.prototype as any).getGetSuperProperty

		for (const definition of body.body) {
			if (definition.type == `ClassProperty`) {
				if (definition.static) {
					if (definition.computed) {
						constructor[evaluateExpressionNode(definition.key, context) as any] = definition.value
							? evaluateExpressionNode(definition.value, context)
							: undefined
					} else {
						assert(definition.key.type == `Identifier`, `${HERE} ${definition.key.type}`)

						constructor[definition.key.name] = definition.value
							? evaluateExpressionNode(definition.value, context)
							: undefined
					}
				} else if (definition.computed)
					propertyDefinitions.set(evaluateExpressionNode(definition.key, context) as any, definition.value || Babel.identifier(`undefined`))
				else {
					assert(definition.key.type == `Identifier`, `${HERE} ${definition.key.type}`)
					propertyDefinitions.set(definition.key.name, definition.value || Babel.identifier(`undefined`))
				}
			} else if (definition.type == `ClassMethod`) {
				if (definition.kind == `constructor`)
					constructorNode = definition
				else if (definition.kind == `method`) {
					if (definition.static) {
						if (definition.computed) {
							const name: any = evaluateExpressionNode(definition.key, context)

							constructor[name] = makeFunction(definition, constructorContext, name)
						} else {
							assert(definition.key.type == `Identifier`, `${HERE} ${definition.key.type}`)

							constructor[definition.key.name] =
								makeFunction(definition, constructorContext, definition.key.name)
						}
					} else if (definition.computed) {
						const name: any = evaluateExpressionNode(definition.key, context)

						constructor.prototype[name] = makeFunction(definition, constructorContext, name)
					} else {
						assert(definition.key.type == `Identifier`, `${HERE} ${definition.key.type}`)
						constructor.prototype[definition.key.name] = makeFunction(definition, constructorContext, definition.key.name)
					}
				} else
					throw Error(`${HERE} ${definition.kind}`)
			} else
				throw Error(`${HERE} ${definition.type}`)
		}

		context.variables[id.name] = constructor

		return
	}

	if (type == `ContinueStatement`) {
		context.signal = { tag: EvaluationContextSignalTag.Continue, label: node.label?.name } as const

		return
	}

	if (type == `DoWhileStatement`) {
		const forContext = scopeEvaluationContext(context)

		do {
			evaluateStatementNode(node.body, forContext)

			if (context.signal?.tag == EvaluationContextSignalTag.Break) {
				if (!context.signal.label)
					context.signal = undefined

				return
			}
		} while (evaluateExpressionNode(node.test, context))

		return
	}

	if (type == `EmptyStatement` || type == `FunctionDeclaration`)
		return

	if (type == `ExpressionStatement`){
		evaluateExpressionNode(node.expression, context)

		return
	}

	if (type == `ForStatement`) {
		const forContext = scopeEvaluationContext(context)

		if (node.init) {
			if (node.init.type == `VariableDeclaration`)
				evaluateStatementNode(node.init, forContext)
			else if (node.init)
				evaluateExpressionNode(node.init, forContext)
		}

		for (;
			node.test ? evaluateExpressionNode(node.test, forContext) : true;
			node.update ? evaluateExpressionNode(node.update, forContext) : undefined
		) {
			evaluateStatementNode(node.body, forContext)

			if (!forContext.signal)
				continue

			if (forContext.signal.tag == EvaluationContextSignalTag.Break) {
				if (forContext.signal.label)
					context.signal = forContext.signal

				return
			}

			if (forContext.signal.tag == EvaluationContextSignalTag.Continue) {
				if (forContext.signal.label && forContext.signal.label != forContext.statementLabel) {
					context.signal = forContext.signal

					return
				}

				forContext.signal = undefined
			}
		}

		return
	}

	if (type == `IfStatement`) {
		if (evaluateExpressionNode(node.test, context))
			evaluateStatementNode(node.consequent, context)
		else if (node.alternate)
			evaluateStatementNode(node.alternate, context)

		return
	}

	if (type == `LabeledStatement`) {
		context.statementLabel = node.label.name

		evaluateStatementNode(node.body, context)

		if (context.signal && context.signal.tag == EvaluationContextSignalTag.Break && context.signal.label == node.label.name)
			context.signal = undefined

		return
	}

	if (type == `ReturnStatement`) {
		const value = node.argument
			? evaluateExpressionNode(node.argument, context)
			: undefined

		context.signal = { tag: EvaluationContextSignalTag.Return, value } as const

		return
	}

	if (type == `ThrowStatement`)
		throw evaluateExpressionNode(node.argument, context)

	if (type == `TryStatement`) {
		try {
			evaluateStatementNode(node.block, context)
			return
		} catch (error) {
			if (!node.handler)
				return

			if (!node.handler.param) {
				evaluateStatementNode(node.handler.body, context)
				return
			}

			assert(node.handler.param.type == `Identifier`, `${HERE} ${node.handler.param.type}`)

			const catchScope = scopeEvaluationContext(context)

			catchScope.variables[node.handler.param.name] = error

			evaluateStatementNode(node.handler.body, catchScope)

			return
		} finally {
			if (node.finalizer)
				evaluateStatementNode(node.finalizer, context)
		}
	}

	if (type == `VariableDeclaration`) {
		const variableMap = node.kind == `var` || node.kind == `let` ? context.variables : context.constants

		for (const childNode of node.declarations) {
			const { id, init } = childNode

			assert(id.type == `Identifier`, `${HERE} ${id.type}`)
			// TODO maybe `context.variables` should just store the type of variable
			delete context.constants[id.name]

			variableMap[id.name] =
				init ?
					init.type == `FunctionExpression` ?
						makeFunction(init, context, id.name)
					: evaluateExpressionNode(init, context)
				: undefined
		}

		return
	}

	if (type == `WhileStatement`) {
		const forContext = scopeEvaluationContext(context)

		do {
			evaluateStatementNode(node.body, forContext)

			if (context.signal?.tag == EvaluationContextSignalTag.Break) {
				if (!context.signal.label)
					context.signal = undefined

				return
			}
		} while (evaluateExpressionNode(node.test, context))

		return
	}

	throw Error(`${HERE} ${type}`)
}
