import type { ArgumentPlaceholder as ArgumentPlaceholderNode, Expression as ExpressionNode, SpreadElement as SpreadElementNode, TSType as TSTypeNode } from "@babel/types"
import { isExpression } from "@babel/types"
import { assert } from "@samual/lib/assert"
import { getVariable, setVariable, type EvaluationContext } from "./EvaluationContext"
import { makeFunction } from "./makeFunction"

export function evaluateExpressionNode(node: ExpressionNode, context: EvaluationContext): unknown {
	const { type } = node

	if (type == `ArrayExpression`) {
		const array: unknown[] = []

		for (const element of node.elements) {
			if (!element)
				array.length++
			else if (element.type == `SpreadElement`)
				array.push(...evaluateExpressionNode(element.argument, context) as any)
			else
				array.push(evaluateExpressionNode(element, context))
		}

		return array
	}

	if (type == `ArrowFunctionExpression`)
		return makeFunction(node, context)

	if (type == `AssignmentExpression`) {
		if (node.left.type == `Identifier`) {
			let left: any = getVariable(node.left.name, context)
			const { operator } = node

			if (operator == `=`)
				left = evaluateExpressionNode(node.right, context)
			else if (operator == `*=`)
				left *= evaluateExpressionNode(node.right, context) as any
			else if (operator == `**=`)
				left **= evaluateExpressionNode(node.right, context) as any
			else if (operator == `/=`)
				left /= evaluateExpressionNode(node.right, context) as any
			else if (operator == `%=`)
				left %= evaluateExpressionNode(node.right, context) as any
			else if (operator == `+=`)
				left += evaluateExpressionNode(node.right, context)
			else if (operator == `-=`)
				left -= evaluateExpressionNode(node.right, context) as any
			else if (operator == `<<=`)
				left <<= evaluateExpressionNode(node.right, context) as any
			else if (operator == `>>=`)
				left >>= evaluateExpressionNode(node.right, context) as any
			else if (operator == `>>>=`)
				left >>>= evaluateExpressionNode(node.right, context) as any
			else if (operator == `&=`)
				left &= evaluateExpressionNode(node.right, context) as any
			else if (operator == `^=`)
				left ^= evaluateExpressionNode(node.right, context) as any
			else if (operator == `|=`)
				left |= evaluateExpressionNode(node.right, context) as any
			else if (operator == `&&=`)
				left &&= evaluateExpressionNode(node.right, context)
			else if (operator == `||=`)
				left ||= evaluateExpressionNode(node.right, context)
			else if (operator == `??=`)
				left ??= evaluateExpressionNode(node.right, context)
			else
				throw Error(`${HERE} ${operator}`)

			return setVariable(node.left.name, left, context)
		}

		assert(node.left.type == `MemberExpression`, () => `${HERE} ${node.left.type}`)
		assert(node.left.property.type != `PrivateName`, HERE)

		// NOTE things are set up the way they are here so that the AST is evaluated in the order the runtime would
		// NOTE evaluate them in since a lot of them but not all disagree with the spec.
		// NOTE be careful attemping to simplify or optimise the code

		const object: any = evaluateExpressionNode(node.left.object, context)

		const key: any = node.left.property.type == `Identifier` && !node.left.computed
			? node.left.property.name
			: evaluateExpressionNode(node.left.property, context)

		const { operator } = node

		if (operator == `=`)
			return object[key] = evaluateExpressionNode(node.right, context)

		if (operator == `*=`)
			return object[key] *= evaluateExpressionNode(node.right, context) as any

		if (operator == `**=`)
			return object[key] **= evaluateExpressionNode(node.right, context) as any

		if (operator == `/=`)
			return object[key] /= evaluateExpressionNode(node.right, context) as any

		if (operator == `%=`)
			return object[key] %= evaluateExpressionNode(node.right, context) as any

		if (operator == `+=`)
			return object[key] += evaluateExpressionNode(node.right, context)

		if (operator == `-=`)
			return object[key] -= evaluateExpressionNode(node.right, context) as any

		if (operator == `<<=`)
			return object[key] <<= evaluateExpressionNode(node.right, context) as any

		if (operator == `>>=`)
			return object[key] >>= evaluateExpressionNode(node.right, context) as any

		if (operator == `>>>=`)
			return object[key] >>>= evaluateExpressionNode(node.right, context) as any

		if (operator == `&=`)
			return object[key] &= evaluateExpressionNode(node.right, context) as any

		if (operator == `^=`)
			return object[key] ^= evaluateExpressionNode(node.right, context) as any

		if (operator == `|=`)
			return object[key] |= evaluateExpressionNode(node.right, context) as any

		if (operator == `&&=`)
			return object[key] &&= evaluateExpressionNode(node.right, context)

		if (operator == `||=`)
			return object[key] ||= evaluateExpressionNode(node.right, context)

		if (operator == `??=`)
			return object[key] ??= evaluateExpressionNode(node.right, context)

		throw Error(`${HERE} ${operator}`)
	}

	if (type == `BigIntLiteral`)
		return BigInt(node.value)

	if (type == `BinaryExpression`) {
		assert(node.left.type != `PrivateName`, HERE)

		const left: any = evaluateExpressionNode(node.left, context)
		const right: any = evaluateExpressionNode(node.right, context)
		const { operator } = node

		if (operator == `+`)
			return left + right

		if (operator == `-`)
			return left - right

		if (operator == `/`)
			return left / right

		if (operator == `*`)
			return left * right

		if (operator == `%`)
			return left % right

		if (operator == `**`)
			return left ** right

		if (operator == `in`)
			return left in right

		if (operator == `instanceof`)
			return left instanceof right

		if (operator == `<`)
			return left < right

		if (operator == `>`)
			return left > right

		if (operator == `<=`)
			return left <= right

		if (operator == `>=`)
			return left >= right

		if (operator == `==`)
			return left == right

		if (operator == `!=`)
			return left != right

		if (operator == `===`)
			return left === right

		if (operator == `!==`)
			return left !== right

		if (operator == `<<`)
			return left << right

		if (operator == `>>`)
			return left >> right

		if (operator == `>>>`)
			return left >>> right

		if (operator == `&`)
			return left & right

		if (operator == `|`)
			return left | right

		if (operator == `^`)
			return left ^ right

		throw Error(`${HERE} ${operator}`)
	}

	if (type == `BooleanLiteral` || type == `NumericLiteral` || type == `StringLiteral`)
		return node.value

	if (type == `CallExpression`) {
		if (node.callee.type == `Super`) {
			if (context.callSuper)
				return context.callSuper(argumentsFromNodes(node.arguments, context))

			throw TypeError(`super cannot be used outside of a class`)
		}

		assert(node.callee.type != `V8IntrinsicIdentifier`, HERE)

		if (node.callee.type != `MemberExpression`)
			return (evaluateExpressionNode(node.callee, context) as any)(...argumentsFromNodes(node.arguments, context))

		if (node.callee.object.type == `Super`) {
			assert(context.callSuperProperty, HERE)

			if (!context.getSuperProperty)
				throw TypeError(`super cannot be used outside of a class`)

			if (node.callee.computed) {
				assert(node.callee.property.type != `PrivateName`, HERE)

				return context.callSuperProperty(
					evaluateExpressionNode(node.callee.property, context),
					context.this,
					argumentsFromNodes(node.arguments, context)
				)
			}

			assert(node.callee.property.type == `Identifier`, `${HERE} ${node.callee.property.type}`)

			return context.callSuperProperty(
				node.callee.property.name,
				context.this,
				argumentsFromNodes(node.arguments, context)
			)
		}

		const object: any = evaluateExpressionNode(node.callee.object, context)

		assert(node.callee.property.type != `PrivateName`, HERE)

		if (node.callee.computed)
			return object[evaluateExpressionNode(node.callee.property, context) as any](...argumentsFromNodes(node.arguments, context))

		assert(node.callee.property.type == `Identifier`, `${HERE} ${node.callee.property.type}`)

		return object[node.callee.property.name](...argumentsFromNodes(node.arguments, context))
	}

	if (type == `ConditionalExpression`) {
		return evaluateExpressionNode(node.test, context)
			? evaluateExpressionNode(node.consequent, context)
			: evaluateExpressionNode(node.alternate, context)
	}

	if (type == `FunctionExpression`)
		return makeFunction(node, context, node.id?.name)

	if (type == `Identifier`)
		return getVariable(node.name, context)

	if (type == `LogicalExpression`) {
		const left = evaluateExpressionNode(node.left, context)
		const operator = node.operator

		if (operator == `&&`)
			return left && evaluateExpressionNode(node.right, context)

		if (operator == `??`)
			return left ?? evaluateExpressionNode(node.right, context)

		if (operator == `||`)
			return left || evaluateExpressionNode(node.right, context)

		throw Error(`${HERE} ${operator}`)
	}

	if (type == `MemberExpression`) {
		const object: any = evaluateExpressionNode(node.object, context)

		if (node.property.type == `Identifier` && !node.computed)
			return object[node.property.name]

		assert(node.property.type != `PrivateName`, HERE)

		return object[evaluateExpressionNode(node.property, context) as any]
	}

	if (type == `NewExpression`) {
		assert(node.callee.type != `V8IntrinsicIdentifier`, HERE)

		return new (evaluateExpressionNode(node.callee, context) as any)(...argumentsFromNodes(node.arguments, context))
	}

	if (type == `NullLiteral`)
		return null

	if (type == `ObjectExpression`) {
		const object: any = {}

		for (const property of node.properties) {
			if (property.type == `SpreadElement`)
				Object.assign(object, evaluateExpressionNode(property.argument, context))
			else if (property.type == `ObjectProperty`) {
				assert(property.key.type != `PrivateName`, HERE)

				let name

				if (property.computed)
					name = evaluateExpressionNode(property.key, context)
				else {
					assert(property.key.type == `Identifier`, `${HERE} ${property.key.type}`)
					name = property.key.name
				}

				assert(property.value.type != `AssignmentPattern`, HERE)
				assert(property.value.type != `RestElement`, HERE)
				assert(property.value.type != `ArrayPattern`, HERE)
				assert(property.value.type != `ObjectPattern`, HERE)

				object[name as any] = property.value.type == `FunctionExpression` || property.value.type == `ArrowFunctionExpression`
					? makeFunction(property.value, context, name)
					: evaluateExpressionNode(property.value, context)
			} else if (property.type == `ObjectMethod`) {
				const kind = property.kind

				if (kind == `get`) {
					if (property.computed) {
						Object.defineProperty(object, evaluateExpressionNode(property.key, context) as any, {
							get: makeFunction(property, context),
							configurable: true,
							enumerable: true
						})

						continue
					}

					assert(property.key.type == `Identifier`, `${HERE} ${property.key.type}`)

					Object.defineProperty(object, property.key.name, {
						get: makeFunction(property, context),
						configurable: true,
						enumerable: true
					})
				} else if (kind == `set`) {
					if (property.computed) {
						Object.defineProperty(object, evaluateExpressionNode(property.key, context) as any, {
							set: makeFunction(property, context),
							configurable: true,
							enumerable: true
						})

						continue
					}

					assert(property.key.type == `Identifier`, `${HERE} ${property.key.type}`)

					Object.defineProperty(object, property.key.name, {
						set: makeFunction(property, context),
						configurable: true,
						enumerable: true
					})
				} else
					throw Error(`${HERE} ${kind}`)
			}
		}

		return object
	}

	if (type == `UpdateExpression`) {
		if (node.argument.type == `Identifier`) {
			let value: any = evaluateExpressionNode(node.argument, context)
			const { operator } = node
			let returnValue

			if (operator == `++`)
				returnValue = node.prefix ? ++value : value++
			else if (operator == `--`)
				returnValue = node.prefix ? --value : value--
			else
				throw Error(`${HERE} ${operator}`)

			setVariable(node.argument.name, value, context)

			return returnValue
		}

		assert(node.argument.type == `MemberExpression`, () => `node.argument.type was "${node.argument.type}"`)

		const object: any = evaluateExpressionNode(node.argument.object, context)
		let key: any

		assert(node.argument.property.type != `PrivateName`, HERE)

		if (node.argument.computed) {
			assert(node.argument.property.type == `Identifier`, HERE)
			key = node.argument.property.name
		} else
			key = evaluateExpressionNode(node.argument.property, context)

		if (node.operator == `++`) {
			if (node.prefix)
				return ++object[key]

			return object[key]++
		}

		if (node.prefix)
			return --object[key]

		return object[key]--
	}

	if (type == `TemplateLiteral`) {
		let string = node.quasis[0]!.value.cooked

		for (let index = 0; index < node.expressions.length; index++) {
			const templateElement = node.quasis[index + 1]!
			const expression: ExpressionNode | TSTypeNode = node.expressions[index]!

			assert(isExpression(expression), HERE)
			string += (evaluateExpressionNode(expression, context) as any) + templateElement.value.cooked
		}

		return string
	}

	if (type == `UnaryExpression`) {
		assert(node.prefix, HERE)
		const { operator } = node

		if (operator == `delete`) {
			if (node.argument.type != `MemberExpression`)
				return true

			const object: any = evaluateExpressionNode(node.argument.object, context)

			assert(node.argument.property.type != `PrivateName`, HERE)

			if (node.argument.computed)
				return delete object[evaluateExpressionNode(node.argument.property, context) as any]

			assert(node.argument.property.type == `Identifier`, `${HERE} ${node.argument.property.type}`)

			return delete object[node.argument.property.name]
		}

		const argument = evaluateExpressionNode(node.argument, context)

		if (operator == `void`)
			return void argument

		if (operator == `typeof`)
			return typeof argument

		if (operator == `+`)
			return +(argument as any)

		if (operator == `-`)
			return -(argument as any)

		if (operator == `~`)
			return ~(argument as any)

		if (operator == `!`)
			return !argument

		if (operator == `throw`)
			throw argument
	}

	if (type == `ThisExpression`) {
		if (context.this === null)
			throw TypeError(`must call super first`)

		return context.this
	}

	if (type == `SequenceExpression`) {
		let finalValue

		for (const expression of node.expressions)
			finalValue = evaluateExpressionNode(expression, context)

		return finalValue
	}

	throw Error(`${HERE} ${type}`)
}

function* argumentsFromNodes(nodes: (ExpressionNode | SpreadElementNode | ArgumentPlaceholderNode)[], context: EvaluationContext): Generator<unknown, void, void> {
	for (const argument of nodes) {
		assert(argument.type != `ArgumentPlaceholder`, HERE)

		if (argument.type == `SpreadElement`)
			yield* evaluateExpressionNode(argument.argument, context) as any
		else
			yield evaluateExpressionNode(argument, context)
	}
}
