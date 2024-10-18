import type { Function as FunctionNode } from "@babel/types"
import { assert } from "@samual/lib/assert"
import { evaluateExpressionNode } from "./evaluateExpressionNode"
import { evaluateStatementNode } from "./evaluateStatementNode"
import { scopeEvaluationContext, type EvaluationContext } from "./EvaluationContext"
import { EvaluationContextSignalTag } from "./EvaluationContextSignalTag"

export function makeFunction(node: FunctionNode, context: EvaluationContext, name: unknown = ``): (...args: unknown[]) => unknown
{
	if (`id` in node && node.id)
		name = node.id.name

	assert(!node.async, HERE)

	return {
		[name as any]: function(...args: unknown[]) {
			const functionContext = scopeEvaluationContext(context)

			functionContext.bindings[0]!.set(`arguments`, { value: arguments, readonly: true })

			if (node.type != `ArrowFunctionExpression`)
				functionContext.this = this

			for (let index = 0; index < node.params.length; index++) {
				const childNode = node.params[index]!

				if (childNode.type == `Identifier`)
					functionContext.bindings[0]!.set(childNode.name, { value: args[index], readonly: false })
				else if (childNode.type == `AssignmentPattern`) {
					assert(childNode.left.type == `Identifier`, `childNode.left.type was ${childNode.left.type}`)

					functionContext.bindings[0]!.set(childNode.left.name, {
						value: args[index] === undefined
							? evaluateExpressionNode(childNode.right, context)
							: args[index],
						readonly: false
					})
				} else
					throw Error(`${HERE} ${childNode.type}`)
			}

			if (node.body.type == `BlockStatement`) {
				evaluateStatementNode(node.body, functionContext)

				if (functionContext.signal && functionContext.signal.tag == EvaluationContextSignalTag.Return) {
					const { value } = functionContext.signal

					functionContext.signal = undefined

					return value
				}

				return
			}

			return evaluateExpressionNode(node.body, functionContext)
		}
	}[name as any]!
}
