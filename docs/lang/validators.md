---
sidebar_position: 13
---

# Validators

Helios validator scripts have a function called `main` that returns a boolean (`true`  or `false`), or void (`()`).

For a spending validator, `main` takes two arguments:

- Datum: data stored on-chain that is linked to the locked UTxO (not avaiable for minting/staking scripts)
- Redeemer: data specified by the user attempting to spend the locked UTxO

The datum and the redeemer can be of any type, except functions.

The structure of a spending validator script looks as follows:

```helios
spending my_validator

import { tx } from ScriptContext

func main(datum: MyDatum, redeemer: MyRedeemer) -> Bool {
    ...                  
}
```

The validator header contains the script purpose.

## Script purpose

In Helios all scripts start with a  **script purpose**, followed by the name of the script. There are 6 script purposes:
  - **spending**
  - **minting**
  - **staking**
  - **testing**
  - **mixed**
  - **module**

On this page we are only concerned with the `spending` script purpose:

```helios
spending my_validator

...
```

`module` is covered in the [next section](../modules).

> **Note**: the name of each Helios source is registered in the global scope, so these names can't be used by statements, nor for the lhs of assignments. So eg. the entrypoint script can't be named `main` as that would conflict with the entrypoint function.

## Datum

Each UTxO locked at a script address will also have an associated datum. The script can choose to use the datum as part of the spending validation, or it can choose to ignore the datum using an underscore (`_`) if it is irrelevant.

The datum can have any type.

## Redeemer

Each UTxO used as an input for a transaction also has a redeemer attached. This is data specified by the user attempting to spend that UTxO. The script can again choose to use or ignore the redeemer using an underscore (`_`) if it is irrelevant to the validation.

The redeemer can have any type.

## Script context

Most of the data needed for writing useful validators is contained in the `tx` field of the [`ScriptContext`](../builtins/scriptcontext.md), which must be imported.

```helios
spending my_validator

import { tx } from ScriptContext
```

## `main` function

The `main` function of a validator script accepts one or two arguments and returns a `Bool` or `()`.

```helios
spending my_validator

...

// redeemer is ignored in this example
func main(datum: MyDatum, _) -> Bool {
    ...
}
```

## Parameters

Parameterizing validators allows dApp developers to create separate instances of a Helios program.  

In Helios, this is done by [`re-binding`](../../api/reference/classes/Program.md#parameters-1) one or more top-level `const PARAM_NAME = ...` declarations.  

After re-binding any const parameters to a different value, the resulting program will have a **different contract address**.

### Example

In this example `OWNER` is a parameter.

```helios
spending my_validator

const OWNER = PubKeyHash::new(#)

func main(_, _, ctx: ScriptContext) -> Bool {
    ctx.tx.is_signed_by(OWNER)
}
```

The parameter can be changed before compiling to the final Uplc format:

```ts
const program = helios.Program.new(src);

program.parameters.OWNER = new helios.PubKeyHash("...");

const uplcProgram = program.compile();
```

Many Helios API types can be used when rebinding the parameters. Also the user-defined types are available through [`program.types`](../../api/reference/classes/Program.md#types). Besides using Helios API types, Javascript primitive objects (i.e. JSON-like) can be used to re-bind a parameter in some cases.

### Contrast with Datum

Attaching Datum data structures to specific UTxOs is another way that a validator or other program can have varying behavior.  

Using Datum causes those explicit details to be included in UTxOs (and/or in transactions consuming them). Transactions spending the UTxOs held at the same script address can each access and use those various Datum details. Noteably, any interested party can trivially query to discover all the various UTxOs held at a single contract address.

By contrast, two different instances of a parameterized contract, otherwise identical, will have separate addresses where UTxOs can be held.  **UTxO's don't need to explicitly contain the parameter values**.  

Querying for UTxO's in separate instances of a parameterized contract is also possible, but requires the interested party to have sufficient knowledge of those separate instance addresses, or other publicly-visible attributes of the target transactions.

Note that any parameterized contract can **also** use per-UTxO Datum values, as needed.


## Example validator: `always_succeeds`

This basic validator allows locked UTxOs to be spent any way the user wants:

```helios
spending always_succeeds

func main(_, _) -> Bool {
    true
}
```

You must use an underscore (`_`) for unused arguments. In this case all three arguments of `main` are ignored by using an underscore.