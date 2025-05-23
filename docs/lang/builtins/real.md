---
title: Real
sidebar_label: Real
sidebar_class_name: type_badge
---

# <span className="type_badge">Real</span>

This is a fixed point real number type with 6 decimal places. `Real` is designed for use in calculations involving relative fees.

```helios
real = 0.001 // 0.1%
```

## Associated functions

### `from_data`

```helios
Real::from_data(data: Data) -> Real
```

### `sqrt`

Calculates the square root of a `Real` number. The result has a maximal error of `0.000001`. Throws an error if the input number is negative.

```helios
Real::sqrt(a: Real) -> Real
```

## Operators

>**Note**: any binary operator defined for `Real` can use `Int` as either the lhs or rhs.

### `==`

```helios
Real == Real -> Bool
```

### `!=`

```helios
Real != Real -> Bool
```

### `>=`

```helios
Real >= Real -> Bool
```

### `>`

```helios
Real > Real -> Bool
```

### `<=`

```helios
Real <= Real -> Bool
```

### `<`

```helios
Real < Real -> Bool
```

### `+`

```helios
Real + Real -> Real
```

### `-`

```helios
Real - Real -> Real
```

### `*`

```helios
Real * Real -> Real
```

### `/`

```helios
Real / Real -> Real
```

## Methods

### `abs`

Returns the absolute value.

```helios
Real.abs() -> Real
```

### `ceil`

Rounds up, returning an [`Int`](./int.md).

```helios
real.ceil() -> Int
```

### `floor`

Rounds down, returning an [`Int`](./int.md).

```helios
real.floor() -> Int
```

### `round`

Rounds towards nearest whole number, returning an [`Int`](./int.md).

```helios
real.round() -> Int
```

### `trunc`

Rounds towards zero, returning an [`Int`](./int.md).

```helios
real.trunc() -> Int
```

### `serialize`

```helios
real.serialize() -> ByteArray
```

### `show`

```helios
real.show() -> String
```