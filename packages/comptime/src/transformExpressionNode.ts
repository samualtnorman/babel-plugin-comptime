import BabelGenerator from "@babel/generator"
import type { Expression } from "@babel/types"
import { EvaluationContext } from "./EvaluationContext"
import { assert } from "@samual/lib/assert"
import { evaluateExpressionNode } from "./evaluateExpressionNode"

const { default: generate } = BabelGenerator as any as { default: typeof BabelGenerator }

export function transformExpressionNode(node: Expression, context: EvaluationContext) {
	const { type } = node

	if (node.leadingComments?.some(comment => comment.value.includes(`@comptime`))) {
		console.log(evaluateExpressionNode(node, context))



		throw `:()`
	}

	if (type == `CallExpression`) {
		assert(node.callee.type != `V8IntrinsicIdentifier`, HERE)
		transformExpressionNode(node.callee, context)

		for (const argumentNode of node.arguments) {
			assert(argumentNode.type != `ArgumentPlaceholder`, HERE)

			if (argumentNode.type == `SpreadElement`)
				transformExpressionNode(argumentNode.argument, context)
			else
				transformExpressionNode(argumentNode, context)
		}
	} else if (type == `MemberExpression`) {
		assert(node.property.type != `PrivateName`, HERE)
		transformExpressionNode(node.object, context)
		transformExpressionNode(node.property, context)
	} else if (type != `Identifier`)
		throw Error(`${HERE} ${type} ${generate(node).code}`)
}
