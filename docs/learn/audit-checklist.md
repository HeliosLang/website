---
sidebar_position: 4
sidebar_label: Audit checklist
---

# Audit checklist

This article lists common EUTXO smart contract issues, and can be used as guide when performing smart contract audits.

## Double satisfaction

Double satisfaction can occur when a spending validator checks that a transaction output matches certain conditions, without ensuring that that output is uniquely linked to the input being spent.

This way two inputs can be spent, whilst only one actual output exists that matches the validator requirements.
This potentially means one of the two inputs loses its corresponding output, and thus loses its value.

## Output spam

Transaction outputs can contain tokens, datums, and reference scripts.

Contract UTXOs are UTXOs that persist contract state, and must remain as clean as possible in order not to prevent them from becoming unspendable by subsequent transactions. 

UTXOs can become unspendable if a validator iterates over its content (i.e. iterates over its tokenlist, or iterates over its datum fields). In more extreme cases, lists contained in transaction inputs are checked to be singletons, and can thus become unspendable due to that check.

Datum fields should also be bounded, because the execution cost of performing operations on those datum fields, increases with increased size.

Reference script spam is not critical, as unused reference scripts only add to the transaction fee, which doesn't have an upper limit.

## Wrong use of redeemers

Validator branching is be based as little as possible on the value of the redeemer.

Redeemers should only be used for:
   - To represent user actions
   - Indexing into lists which contain only unique entries
   - Introducing signed off-chain data

Deterministic actions performed by a transaction should be based on the datum + script context, not on the redeemer.

## Public deregistration of a staking witness

Staking validators can be used as transaction witnesses by using the zero-withdraw trick.

Staking validators must however be registered before they can be used.
Sometimes smart contracts forget to handle the deregistration action, which allows anyone to deregister such a validator, and thus claim the staking deposit.

Make sure to handle the deregistration action inside any staking validator.

## UTXO contention

If a UTXO can be spent by multiple public entities, they might try to do so at the same time. In this case only one of the transactions will succeed at a time.

Though this isn't a critical issue, it can deteriorate the user experience of a smart contract.