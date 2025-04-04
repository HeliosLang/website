---
sidebar_position: 3
---
# Primitive types

Helios has 5 **primitive** types:
  * `Int` (unbounded integer)
  * `Real` (fixed point real number)
  * `Bool` (`true` or `false`)
  * `String` (utf-8 text)
  * `ByteArray` (array of uint8 numbers)

## `Int`

Helios' `Int` type represents an unbounded integer (like Haskell's `Integer` type).

Helios supports common integer literals:

```helios
my_decimal = 17
my_binary  = 0b10001
my_hex     = 0x11
my_octal   = 0o121
```

Large literal integers can be delimited with underscores at power-of-3 positions:

```helios
my_large_decimal = 1_000_000
```

More information about the `Int` type can be found [here](./builtins/int.md).

## `Real`

Helios' `Real` type represents a fixed point real number with 6 decimal places, which provides reasonable precision for calculations involving relative fees.

```helios
fee = 0.0001 // 0.01%
```

Similar to `Int`, underscores can be used at power-of-3 positions to improve readability:

```helios
fee = 0.000_1 // 0.01%
```

More information about the `Real` type can be found [here](./builtins/real.md).

## `Bool`

The `Bool` type has two possible literal values: `true` or `false`.

Booleans are used throughout validator scripts, and the return type of a validator script can be a boolean. The simplest validator script body is just a literal boolean:

```helios
func main(_, _) -> Bool {
    true
}
```

The equality (`==`) and inequality (`!=`) operators, returning boolean results, are defined on all builtin and user types:

```helios
func main(datum: Int, redeemer: Int) -> Bool {
    datum == redeemer
}
```

More information about the `Bool` type can be found [here](./builtins/bool.md).

## `String`

A literal Helios string uses double quotes (`"..."`):

```helios
my_message = "Hello world"
```

Similar to all other values in Helios, strings are immutable and have a fixed length. 

Strings cannot *grow* after definition. Concatenating two strings creates a new string:

```helios
string_1 = "Hello"
string_2 = " world"

result = string_1 + string_2
```

More information about the `String` type can be found [here](./builtins/string.md).

## `ByteArray`

The `ByteArray` type, obviously, represents an array of bytes. A literal `ByteArray` is either a hexadecimal sequence prefixed by `#`, or a UTF-8 string prefixed by `b`:

```helios
my_bytes = #48656c6c6f20776f726c64
my_bytes = b"Hello world"
```

All builtin and user types can be converted into a `ByteArray` using the builtin [`serialize`](./user-defined-types/methods/automatic-methods.md#serialize) method:

```helios
cbor_bytes = 123.serialize() // cbor encoding of 123
```

More information about the `ByteArray` type can be found [here](./builtins/bytearray.md).

> **Note**: a `ByteArray` can be empty, so the following is valid syntax: `my_bytes = #`