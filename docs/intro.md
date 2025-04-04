---
sidebar_position: 1
sidebar_label: Get started
---
# Introduction

[Helios](https://github.com/Hyperion-BT/Helios) is a Javascript/Typescript smart contract SDK for [Cardano](https://www.cardano.org). Helios is all you need to build dApps on Cardano, including a simple smart contract language: the **[Helios language](./lang/index.md)**.

## Example smart contract

```helios
spending always_true 

func main(_datum, _redeemer) -> Bool {
    true
}
```

## Structure of this book

Before starting to use Helios to create smart contracts and build dApps it is important to understand Cardano's eUTxO model very well. If you don't yet, we recommend you read the [Understanding eUTxOs](./understanding-eutxos.md) preface first.

[Chapter 1](./lang/index.md) covers the language, including a complete reference of the language builtins.

[Chapter 2](./api/index.md) covers how to use the Helios API to compile smart contracts, and create smart contract transactions, including a complete reference of the library exports.

[Chapter 3](./cli/index.md) covers how to use the Helios CLI to build dApps, including a complete reference of the CLI commands.

[Chapter 4](./further-reading/index.md) contains a variety of articles to help you become a better Cardano dApp architect.