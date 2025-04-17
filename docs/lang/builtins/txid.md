---
title: TxId
sidebar_label: TxId
sidebar_class_name: type_badge
---
# <span className="type_badge">TxId</span>

This is a type-safe wrapper around `ByteArray` representing the hash of a transaction.


## Associated functions

### `new`

```helios
TxId::new(bytes: ByteArray) -> TxId
```

### `from_data`

```helios
TxId::from_data(data: Data) -> TxId
```

## Getters

```helios
tx_id.bytes -> ByteArray
```

## Operators

### `==`

```helios
TxId == TxId -> Bool
```

### `!=`

```helios
TxId != TxId -> Bool
```

### `>=`

```helios
TxId >= TxId -> Bool
```

### `>`

```helios
TxId > TxId -> Bool
```

### `<=`

```helios
TxId <= TxId -> Bool
```

### `<`

```helios
TxId < TxId -> Bool
```

## Methods

### `serialize`

```helios
tx_id.serialize() -> ByteArray
```

### `show`

Hexadecimal representation of a `TxId`.

```helios
tx_id.show() -> String
```