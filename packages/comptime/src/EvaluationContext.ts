import type { EvaluationContextSignalTag } from "./EvaluationContextSignalTag"

export type EvaluationContextSignal =
	{ tag: EvaluationContextSignalTag.Break | EvaluationContextSignalTag.Continue, label: string | undefined } |
	{ tag: EvaluationContextSignalTag.Return, value: unknown }

export type EvaluationContext = {
	bindings: Map<string, { value: unknown, readonly: boolean }>[]
	statementLabel: string | undefined
	this: unknown
	callSuper: ((args: Iterable<unknown>) => unknown) | undefined
	getSuperProperty: ((name: unknown) => unknown) | undefined
	callSuperProperty: ((name: unknown, this_: unknown, args: Iterable<unknown>) => unknown) | undefined
	signal: EvaluationContextSignal | undefined
}

export const scopeEvaluationContext = (context: EvaluationContext): EvaluationContext => ({
	bindings: Object.create(context.bindings),
	statementLabel: undefined,
	this: context.this,
	signal: undefined,
	callSuper: context.callSuper,
	getSuperProperty: context.getSuperProperty,
	callSuperProperty: context.callSuperProperty
})

export function getVariable(name: string, context: EvaluationContext): unknown {
	const map = context.bindings.find(map => map.has(name))

	if (!map)
		throw new ReferenceError(`${HERE} Tried to get non-existent binding ${name}`)

	return map.get(name)!.value
}

export function setVariable(name: string, value: any, context: EvaluationContext): void {
	const map = context.bindings.find(map => map.has(name))

	if (!map)
		throw new ReferenceError(`${HERE} Tried to set non-existent binding ${name}`)

	const binding = map.get(name)!

	if (binding.readonly)
		throw new TypeError(`${HERE} Tried to set constant ${name}`)

	binding.value = value
}
