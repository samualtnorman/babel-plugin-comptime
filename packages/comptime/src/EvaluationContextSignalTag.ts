declare enum EvaluationContextSignalTagEnum {
	Break,
	Continue,
	Return
}

export type EvaluationContextSignalTag = EvaluationContextSignalTagEnum
export type EvaluationContextSignalTagName = keyof typeof EvaluationContextSignalTagEnum

export namespace EvaluationContextSignalTag {
	export type Break = EvaluationContextSignalTagEnum.Break
	export type Continue = EvaluationContextSignalTagEnum.Continue
	export type Return = EvaluationContextSignalTagEnum.Return
}

export const EvaluationContextSignalTag: { [K in EvaluationContextSignalTagName]: typeof EvaluationContextSignalTagEnum[K] } = {
	Break: 1,
	Continue: 2,
	Return: 3,
}

export const EvaluationContextSignalTagsToNames: Record<number, string> = {
	1: "Break",
	2: "Continue",
	3: "Return",
}
