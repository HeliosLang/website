# How to make validators unique

The Helios compiler optimizes its UPLC output very aggressively. Dead code is eliminated and anything that evaluates to a literal is replaced by that literal.

Adding an unused `const` parameter to make different instantiations of a validator unique, will therefore not work.

## Wrapping with UPLC terms

One low-level approach is to wrap a UPLC program with a Lambda term, and then apply a Const term.

```js
import { Program } from "@helios-lang/compiler"
import { makeUplcCall, makeUplcConst, makeUplcInt, makeUplcLambda } from "@helios-lang/uplc"

const src = `...`
const program = new Program(src)
const unwrappedUplc = program.compile(true)

const wrappedUplc = makeUplcProgramV2(
    makeUplcCall({
        fn: makeUplcLambda({body: unwrappedUplc.root}),
        arg: makeUplcConst({value: makeUplcInt(123)})
    })
)
```