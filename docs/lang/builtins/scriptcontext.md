---
title: ScriptContext
sidebar_label: ScriptContext
sidebar_class_name: namespace_badge
---

# <span className="namespace_badge">ScriptContext</span>

The `ScriptContext` is a builtin namepspace containing all information related to signed Cardano transaction being validated.

`ScriptContext` will commonly be used to import [`tx`](./tx.md):

```helios
import { tx } from Scriptcontext
```

## `get_current_input`

A function that returns the current UTXO being spent as a [`TxInput`](./txinput.md).

Can only be called during `spending` validations, and throws an error otherwise.

```helios
import { get_current_input } from ScriptContext

...

get_current_input() -> TxInput
```


## `get_spending_purpose_output_id`

A function that returns the [`TxOutputId`](./txoutputid.md) of the current UTXO being spent.

Can only be called during `spending` validations, and throws an error otherwise.

```helios
import { get_spending_purpose_output_id } from ScriptContext

...

get_spending_purpose_output_id() -> TxOutputId
```


## `get_cont_outputs`

A function that returns the [`outputs`](./txoutput.md) sent back to the current validator script.

Can only be called during `spending` validations, and throws an error otherwise.

```helios
import { get_cont_outputs } from ScriptContext

...

get_cont_outputs() -> []TxOutput
```

### `get_current_validator_hash`

A function that returns the [`ValidatorHash`](./validatorhash.md) of the current script.

Can only be called during `spending` validations, and throws an error otherwise.

```helios
import { get_current_validator_hash } from ScriptContext

...

get_current_validator_hash() -> ValidatorHash
```

### `get_current_minting_policy_hash`

A function that returns the [`MintingPolicyHash`](./mintingpolicyhash.md) of the minting policy being evaluated.

Can only be called during `minting` validations, and throws an error otherwise.

```helios
import { get_current_minting_policy_hash } from ScriptContext

...

get_current_minting_policy_hash() -> MintingPolicyHash
```

### `get_staking_purpose`

A function that returns the current [`StakingPurpose`](./stakingpurpose.md) (`Rewarding` or `Certifying`).

Can only be called during `staking` validations, and throws an error otherwise.

```helios
import { get_staking_purpose } from ScriptContext

...

get_staking_purpose() -> StakingPurpose
```

## `purpose`

The current validation [purpose](./scriptpurpose.md).

```
import { purpose } from ScriptContext

...

purpose -> ScriptPurpose
```

## `tx`

Get the current [`Tx`](./tx.md) data structure.

```helios
import { tx } from ScriptContext

...

tx -> Tx
```
