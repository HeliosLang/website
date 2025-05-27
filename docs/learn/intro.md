---
sidebar_position: 1
sidebar_label: Get started
---
# Get started

Create a new directory and initialize npm:
```sh
$ mkdir helios_get_started
$ cd ./helios_get_started
$ npm init es6 -y
```

Install the compiler and utility libraries:
```
$ npm install @helios-lang/compiler @helios-lang/codec-utils @helios-lang/uplc
```

Create a file called `validator.hl`, with the following content:
```helios
spending redeemer_equals_datum

func main(datum: Int, redeemer: Int) -> () {
    assert(redeemer == datum, "redeemer not equal to datum")
}
```

Create a JS script called `compile.js`, with the following content:
```js
import { readFileSync } from "node:fs"
import { bytesToHex } from "@helios-lang/codec-utils"
import { Program } from "@helios-lang/compiler"
import { makeIntData, makeUplcDataValue } from "@helios-lang/uplc"

// compile the validator
const src = readFileSync("./validator.hl").toString()
const program = new Program(src)
const uplc = program.compile()

// test with a dummy script context
const datum = makeUplcDataValue(makeIntData(0))
const redeemer = makeUplcDataValue(makeIntData(0))
const scriptContext = makeUplcDataValue(makeIntData(0))
const { result } = uplc.eval([datum, redeemer, scriptContext])

// check the return value
if ("right" in result) {
    if (result.right.kind != "unit") {
        throw new Error(`unexpected return value, expected '()' but got '${result.right.toString()}'`)
    }
} else {
    throw new Error(`evaluation failed: ${result.left.error}`)
}

// serialize the compiled validator
console.log(bytesToHex(uplc.toCbor()))
```

Run the script:
```sh
$ node ./compile.js
581c581a01000022233225333573466e1c00400852616375a0066eb40081
```

The printed output is the hex encoded bytecode of the validator.

## Further reading

Before starting to use Helios to create smart contracts and build dApps it is important to understand Cardano's EUTXO model very well. If you don't yet, we recommend you read the [Understanding EUTXOs](./understanding-eutxos) preface first.