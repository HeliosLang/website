---
title: ByteArray
sidebar_label: ByteArray
sidebar_class_name: type_badge
---

# <span className="type_badge">ByteArray</span>

Represents an array of bytes (i.e. an array of uint8 numbers).

```helios
byte_array = #213212; ...
```

> **Note**: in Haskell/Plutus this is called a `ByteString`, but we thought that that was too ambiguous, so we chose `ByteArray` instead.

## Associated functions

### `from_data`

```helios
ByteArray::from_data(data: Data) -> ByteArray
```

### `parse`

Parses a hexadecimal encoded `ByteArray`.

```helios
ByteArray::parse(hex: String) -> String
```

## Getters

### `length`

Returns the number of bytes in the `ByteArray`.

```helios
byte_array.length -> Int 
```

## Operators

### `==`

```helios
ByteArray == ByteArray -> Bool
```

### `!=`

```helios
ByteArray != ByteArray -> Bool
```

### `>=`

```helios
ByteArray >= ByteArray -> Bool
```

### `>`

The lhs is greater-than the rhs if the first rhs byte, that isn't equal to the corresponding lhs byte, is smaller than that byte. Returns true if all common bytes are equal, but the rhs is shorter than the lhs.


```helios
ByteArray > ByteArray -> Bool
```

### `<=`

```helios
ByteArray <= ByteArray -> Bool
```

### `<`

The lhs is less-than the rhs if the first rhs byte, that isn't equal to the corresponding lhs byte, is greater than that byte. Returns false if the rhs is empty.

```helios
ByteArray < ByteArray -> Bool
```

### `+`

Concatenation of two `ByteArray`s.

```helios
ByteArray + ByteArray -> ByteArray
```

## Methods

### `blake2b`

Calculates the blake2b-256 hash of a `ByteArray`. The result is 32 bytes long.

```helios
byte_array.blake2b() -> ByteArray
```

### `decode_utf8`

Turns a valid sequence of utf-8 bytes into a `String`. Throws an error if the `ByteArray` isn't valid utf-8.

```helios
byte_array.decode_utf8() -> String
```

### `decode_utf8_safe`

Like `ByteArray.decode_utf8`, but returns the hex representation if the `ByteArray` isn't valid UTF-8.

```helios
byte_arrya.decode_utf8_safe() -> String
```

### `ends_with`

Checks if a `ByteArray` ends with a given suffix.

```helios
byte_array.ends_with(suffix: ByteArray) -> Bool
```

### `prepend`

Prepends an `Int` byte, returning a new `ByteArray`.

Modulo 256 is applied internally to the byte before prepending.

```helios
byte_array.prepend(byte: Int) -> ByteArray
```

### `serialize`

```helios
byte_array.serialize() -> ByteArray
```

### `sha2`

Calculates the sha2-256 hash of a `ByteArray`. The result is 32 bytes long.

```helios
byte_array.sha2() -> ByteArray
```

### `sha3`

Calculates the sha3-256 hash of a `ByteArray`. The result is 32 bytes long.

```helios
byte_array.sha3() -> ByteArray
```

### `show`

Converts a `ByteArray` into its hexadecimal representation.

```helios
byte_array.show() -> String
```

### `slice`

```helios
byte_array.slice(start: Int, end: Int) -> ByteArray
```

### `starts_with`

Checks if a `ByteArray` starts with a given prefix.

```helios
byte_array.starts_with(prefix: ByteArray) -> Bool
```