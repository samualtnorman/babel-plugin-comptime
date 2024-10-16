import type { Statement } from "@babel/types"
import { EvaluationContext } from "./EvaluationContext"
import BabelGenerator from "@babel/generator"
import { transformExpressionNode } from "./transformExpressionNode"

const { default: generate } = BabelGenerator as any as { default: typeof BabelGenerator }

export function transformStatementNode(node: Statement, context: EvaluationContext) {
	const { type } = node

	if (node.type == `FunctionDeclaration`)
		return

	if (node.type == `ExpressionStatement`) {
		transformExpressionNode(node.expression, context)

		return
	}

	throw Error(`${HERE} ${type} ${generate(node).code}`)
}
