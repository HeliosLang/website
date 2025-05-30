---
sidebar_position: 8
---

# Enums

Enums are used to represent types that have multiple variants (sometimes called [*tagged unions* or *sum types*](https://en.wikipedia.org/wiki/Tagged_union)). These are useful for datums and redeemers.

Example of an enum:

```helios
enum Redeemer {
	Cancel
	Buy { buyer: PubKeyHash }
}

// instantiating an enum:
const my_redeemer = Redeemer::Buy { PubKeyHash::new(#...) } 
// type of 'my_redeemer' is inferred
```

> **Note**: the OOP analogy of an enum is an abstract class, and the enum variants can be thought of as concrete implementations (i.e. child classes).

> **Note**: enum variants without fields don't use braces.

## Methods

Like structs, methods can be places inside `enum` blocks.

The un-annotated `self` argument of `enum` methods, is implicitly typed as the enum base type.

## `Data`

[`Data`](./builtins/data.md) is a special builtin enum with 5 members:
  * `Date::IntData`
  * `Data::ByteArrayData`
  * `Data::ListData`
  * `Data::MapData`
  * `Data::ConstrData`

A `switch` expression over `Data` can use any of these as case types:

```helios
data.switch{
	i: IntData => ...,
	b: ByteArrayData => ...,
	l: ListData => ...,
	m: MapData => ...,
	c: ConstrData => ... 
}
```

> **Note**: the default `_` case can also be used as a substitute for any of these cases.