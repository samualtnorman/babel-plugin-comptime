import type { Statement } from "@babel/types"
import { assert } from "@samual/lib/assert"
import type { EvaluationContext } from "./EvaluationContext"
import { makeFunction } from "./makeFunction"

export function hoist(nodes: Statement[], context: EvaluationContext): void {
	for (const childNode of nodes) {
		if (childNode.type == `VariableDeclaration` && childNode.kind == `var`) {
			for (const declaration of childNode.declarations) {
				assert(declaration.id.type == `Identifier`, `${HERE} ${declaration.id.type}`)
				context.variables[declaration.id.name] = undefined
			}
		} else if (childNode.type == `ForStatement` && childNode.init && childNode.init.type == `VariableDeclaration` && childNode.init.kind == `var`) {
			for (const declaration of childNode.init.declarations) {
				assert(declaration.id.type == `Identifier`, `${HERE} ${declaration.id.type}`)
				context.variables[declaration.id.name] = undefined
			}
		} else if (childNode.type == `FunctionDeclaration`) {
			assert(childNode.id, HERE)

			const functionDeclaration = childNode
			const { id } = childNode

			context.variables[id.name] = makeFunction(functionDeclaration, context, id.name)
		} else if (childNode.type == `ExportNamedDeclaration` && childNode.declaration?.type == `FunctionDeclaration`) {
			assert(childNode.declaration.id, HERE)

			const functionDeclaration = childNode.declaration
			const { id } = childNode.declaration

			context.variables[id.name] = makeFunction(functionDeclaration, context, id.name)
		}
	}
}
