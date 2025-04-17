---
title: Ratio
sidebar_label: Ratio
sidebar_class_name: type_badge
---

# <span className="type_badge">Ratio</span>

Represents a ratio of two integers, which can be used to represent arbitrary precision numbers on-chain.

## Associated functions

### `from_data`

```helios
Ratio::from_data(data: Data) -> Ratio
```

### `new`

```helios
Ratio::new(top: Int, bottom: Int) -> Ratio
```

## Getters

### `bottom`

The denominator of the `Ratio`.

```helios
ratio.bottom -> Int
```

### `top`

The numerator of the `Ratio`.

```helios
ratio.top -> Int
```

## Operators

### `==`

Exact equals: returns `true` if the denominators are equal **and** the numerators are equal.

```helios
Ratio == Ratio -> Bool
```

Use `ratio.equals()` for a non-exact equality comparison.

### `!=`

Exact not-equals: returns `false` if the denomitors aren't equal **or** the numerators aren't equal.

```helios
Ratio != Ratio -> Bool
```

### `+`

```helios
Ratio + Ratio -> Ratio
Ratio + Int -> Ratio
```

### `-`

```helios
Ratio - Ratio -> Ratio
Ratio - Int -> Ratio
```

### `*`

```helios
Ratio * Ratio -> Ratio
Ratio * Int -> Ratio
```

### `/`

```helios
Ratio / Ratio -> Ratio
Ratio / Int -> Ratio
```

### `<`

```helios
Ratio < Ratio -> Bool
Ratio < Int -> Bool
```

### `<=`

```helios
Ratio <= Ratio -> Bool
Ratio <= Int -> Bool
```

### `>`

```helios
Ratio > Ratio -> Bool
Ratio > Int -> Bool
```

### `>=`

```helios
Ratio >= Ratio -> Bool
Ratio >= Int -> Bool
```

## Methods

### `ceil`

Rounds a `Ratio` upwards, returning an `Int`.

```helios
ratio.ceil() -> Int
```

### `equals`

Non-exact equality comparison, which checks that `a.top * b.bottom == b.top * a.bottom`.

```helios
a.equals(b: Ratio) -> Bool
```

### `floor`

Rounds a `Ratio` downwards, returning an `Int`.

```helios
ratio.floor() -> Int
```

### `round`

Rounds a `Ratio` to the nearest `Int`.

```helios
ratio.round() -> Int
```

### `to_real`

Truncates the `Ratio` to `Real` (a `Real` is equivalent to a `Ratio` with `1_000_000` as a denominator).

```helios
ratio.to_real() -> Real
```

### `trunc`

Rounds a `Ratio` towards zero, returning an `Int`.

```helios
ratio.trunc() -> Int
```
