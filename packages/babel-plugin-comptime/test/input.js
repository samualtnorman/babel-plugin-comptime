const foo = () => {
	// no side effects
	return 1 + 2
}

const bar = () => {
	console.log("I'm a side effect")

	return 3 + 4
}

console.log(foo())
console.log(bar())
