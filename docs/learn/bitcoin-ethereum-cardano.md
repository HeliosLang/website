---
sidebar_position: 3
sidebar_label: Bitcoin vs Ethereum vs Cardano
---

# Bitcoin vs Ethereum vs Cardano

Bitcoin, Ethereum and Cardano are often referred to as 1st, 2nd and 3rd generation blockchains respectively.

This article explains the ledger models of each, and how they can be used for a common financial contract: a basic vesting contract.

Such a concrete example makes it easier to understand Cardano's EUTXO model, especially for those with Bitcoin or Ethereum smart contract experience.

## Basic vesting contract

Alice owns a company. She wants to reward her employee Bob with shares if he stays with the company for at least one year.

Alice can use a basic vesting smart contract to lock tokenized versions of those shares for one year. After one year Bob can redeem the tokens.

Alice needs the ability to cancel the contract if Bob leaves the company early, but Bob doesn't trust Alice. Bob and Alice both trust Charlie, who acts as arbiter for early termination.

The contract logic can be summarized as:

   - Alice can redeem the tokens before one year, using Charlie's signature
   - Bob can redeem the tokens after one year

## Bitcoin

Bitcoin pioneered the Unspent Transaction Output (UTXO) model.

Bitcoin is notable for not allowing Turing-complete smart contracts. This means that arbitrary logic cannot be expressed by Bitcoin smart contracts.

Though Bitcoin doesn't support attaching datums to UTXOs, the notion of *state* still exists. The *state* of a Bitcoin smart contract is what value sits at which addresses at any given time (ie. the valid set of UTXOs).

Bitcoin transactions evolve the *state* of a Bitcoin smart contract.

If all possible states of a Bitcoin smart contract are known in advance, then all possible transactions can be created in advance as well, and pre-signed by the contract parties.

Which transactions are valid depends on the script logic of each address. Bitcoin script logic typically consists of:

   - Relative or absolute time-locks
   - Required signatures
   - Secret revelation using hashing functions

In case of the vesting contract, Alice creates an unsigned transaction that sends the tokens to a 2-of-2 multi-signature address.

Alice and Bob agree to create and sign two more transactions:

   1. A transaction that unlocks before one year, that must contain Charlie's signature, sending the tokens back to Alice's wallet address
   2. A transaction that unlocks after one year, sending the tokens to Bob's wallet address

Both transactions are signed by both Alice and Bob, thus both match the lock criterium of the initial 2-of-2 multi-signature address. The 1st redeeming transaction is valid before the end of the year, but is still missing Charlie's signature. The 2nd redeeming transaction is valid after one year. 

Once both Alice and Bob have the (partially) signed redeeming transactions, Alice signs and submits the initial transaction to the blockchain.

If Bob leaves the company early, Alice asks Charlie for his signature, and she submits the 1st redeeming transaction.

If the year passes, Bob can submit the 2nd redeeming transaction.

> Note: a nice property of Bitcoin smart contracts is that they can largely be handled off-chain, and only final settlement needs to be submitted on-chain (see [Lightning Network](https://en.wikipedia.org/wiki/Lightning_Network)).

## Ethereum

Ethereum came after Bitcoin, and is the first blockchain with a Turing-complete on-chain runtime environment, called the Ethereum Virtual Machine (EVM).

EVM smart contracts are simpler than (E)UTXO smart contracts, because *state* mutations are performed directly, instead of perfoming validation and transaction building as two separate processes.

The *state* of the EVM vesting contract consists of:

   - Creation time
   - The policy of the tokens (eg. an ERC-20 policy)
   - The number of tokens
   - Alice's address
   - Bob's address
   - Charlie's public key

The contract *state* is initialized upon contract creation, giving it a unique address. Then Alice can send the tokens to the contract address.

The vesting contract has two exported functions: 
  
   1. `cancel`
   2. `redeem`

The `cancel` function takes Charlie's signature as an argument. If the signature is valid, and `tx.origin` is equal to Alice's address, and no more than one year has passed since the contract creation time, the token policy `withdraw` function is called, withdrawing the given number of tokens to Alice's address.

The `redeem` function doesn't take any arguments, and checks that one year has passed and that `tx.origin` is equal to Bob's address. The tokens will then be withdrawn to Bob's address.

> Note: the ERC-20 `withdraw` function only allows withdrawals from the `msg.sender` address, which corresponds to the address of the vesting contract.

## Cardano

Cardano uses  the EUTXO model and is similar to Bitcoin. But Cardano's EUTXO model isn't a superset of Bitcoin's UTXO model because it doesn't support unlock scripts and misses relative time-locks.

Cardano does however allow creating Turing-complete lock scripts called *validators*. This means that the unlock logic can be part of the validator, and can be triggered depending on which redeemer arguments are passed in when spending UTXOs.

Pre-creating and signing all possible transactions, though offering better privacy, is inconvenient. It is much easier to use Cardano's EUTXO model, which allows Alice to send the tokens directly to an appropriate validator.

That validator then uses the following rules to validate the redeeming transaction:

   - If less than one year has passed, the transaction must be signed by both Alice and Charlie (Alice can send the tokens wherever she wants)
   - If more than one year has passed, the transaction must be signed by Bob (he can send the tokens wherever he wants)

The Helios implementation of the basic vesting contract:

```helios
spending vesting

import { tx } from ScriptContext

const T0: Time
const ALICE: PubKeyHash
const BOB: PubKeyHash
const CHARLIE: PubKeyHash

func main(_, _) -> Bool {
    if (tx.time_range.is_after(T0 + 365*Duration::DAY)) {
        tx.is_signed_by(BOB)
    } else {
        tx.is_signed_by(ALICE)
        && tx.is_signed_by(CHARLIE)
    }
}
```

