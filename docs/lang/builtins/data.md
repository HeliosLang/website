---
title: Data
sidebar_label: Data
sidebar_class_name: enum_badge
---

# <span className="enum_badge">Data</span>

Represents type-less data, as returned by the [`OutputDatum.get_inline_data()`](./outputdatum.md#get_inline_data). Can be cast directly into any other type using `from_data`, or indirectly using [`switch`](../enums.md#data).

## Getters

### `tag`

Gets tag index of `ConstrData`. Throws an error if not `ConstrData`.

```helios
data.tag -> Int
```

## Operators

### `==`

```helios
Data == Data -> Bool
```

### `!=`

```helios
Data != Data -> Bool
```

## Methods

### `serialize`

```helios
data.serialize() -> ByteArray
```