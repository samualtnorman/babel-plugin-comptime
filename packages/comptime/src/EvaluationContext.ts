import type { EvaluationContextSignalTag } from "./EvaluationContextSignalTag"

export type EvaluationContextSignal =
	{ tag: EvaluationContextSignalTag.Break | EvaluationContextSignalTag.Continue, label: string | undefined } |
	{ tag: EvaluationContextSignalTag.Return, value: unknown }

export type EvaluationContext = {
	variables: Record<string, unknown>
	constants: Record<string, unknown>
	statementLabel: string | undefined
	this: unknown
	callSuper: ((args: Iterable<unknown>) => unknown) | undefined
	getSuperProperty: ((name: unknown) => unknown) | undefined
	callSuperProperty: ((name: unknown, this_: unknown, args: Iterable<unknown>) => unknown) | undefined
	signal: EvaluationContextSignal | undefined
}

export const scopeEvaluationContext = (context: EvaluationContext): EvaluationContext => ({
	variables: Object.create(context.variables),
	constants: Object.create(context.constants),
	statementLabel: undefined,
	this: context.this,
	signal: undefined,
	callSuper: context.callSuper,
	getSuperProperty: context.getSuperProperty,
	callSuperProperty: context.callSuperProperty
})

export function getVariable(name: string, context: EvaluationContext): unknown {
	if (name in context.constants)
		return context.constants[name]

	if (name in context.variables)
		return context.variables[name]

	throw new ReferenceError(`${HERE} ${name} is not defined`)
}

export function setVariable(name: string, value: any, context: EvaluationContext): unknown {
	if (name in context.constants)
		throw new TypeError(`assignment to constant`)

	for (let scope = context.variables; scope; scope = Object.getPrototypeOf(scope)) {
		if (Object.hasOwn(scope, name))
			return scope[name] = value
	}

	throw new ReferenceError(`assignment to undeclared variable ${name}`)
}
