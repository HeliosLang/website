---
title: ValidatorHash
sidebar_label: ValidatorHash
sidebar_class_name: type_badge
---
# <span className="type_badge">ValidatorHash</span>

[Opaque](https://en.wikipedia.org/wiki/Opaque_data_type) [`ByteArray`](./bytearray.md) that represents the hash of a validator script.

The first part of a script address is formed by a `ValidatorHash`.

## Associated functions

### `new`

```helios
ValidatorHash::new(bytes: ByteArray) -> ValidatorHash
```

### `from_data`

```helios
ValidatorHash::from_data(data: Data) -> ValidatorHash
```

### `from_script_hash`

Casts the generic [`ScriptHash`](./scripthash.md) type into `ValidatorHash`.

```helios
ValidatorHash::from_script_hash(hash: ScriptHash) -> ValidatorHash
```

## Getters

### `bytes`

```helios
validator_hash.bytes -> ByteArray
```

## Operators

### `==`

```helios
ValidatorHash == ValidatorHash -> Bool
```

### `!=`

```helios
ValidatorHash != ValidatorHash -> Bool
```

### `>=`

```helios
ValidatorHash >= ValidatorHash -> Bool
```

### `>`

```helios
ValidatorHash > ValidatorHash -> Bool
```

### `<=`

```helios
ValidatorHash <= ValidatorHash -> Bool
```

### `<`

```helios
ValidatorHash < ValidatorHash -> Bool
```

## Methods

### `serialize`

```helios
validator_hash.serialize() -> ByteArray
```

### `show`

Hexadecimal representation of the `ValidatorHash`.

```helios
validator_hash.show() -> String
```