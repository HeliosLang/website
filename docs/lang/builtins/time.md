---
title: Time
sidebar_label: Time
sidebar_class_name: type_badge
---
# <span className="type_badge">Time</span>

Represents POSIX time in milliseconds (time since 1970/01/01 00:00:00 UTC).

## Associated functions

### `new`

```helios
Time::new(millis_since_1970: Int) -> Time
```

### `from_data`

```helios
Time::from_data(data: Data) -> Time
```

## Operators

### `==`

```helios
Time == Time -> Bool
```

### `!=`

```helios
Time != Time -> Bool
```

### `>=`

```helios
Time >= Time -> Bool
```

### `>`

```helios
Time > Time -> Bool
```

### `<=`

```helios
Time <= Time -> Bool
```

### `<`

```helios
Time < Time -> Bool
```

### `+`

```helios
Time + Duration -> Time
```

### `-`

Subtracting a [`Duration`](./duration.md) from a `Time` is like adding a negative [`Duration`](./duration.md).

```helios
Time - Duration -> Time
```

The difference of two `Time` instances is a [`Duration`](./duration.md).

```helios
Time - Time -> Duration
```

## Methods

### `serialize`

```helios
time.serialize() -> ByteArray
```

### `show`

Decimal representation of the underlying raw `Int`.

```helios
time.show() -> String
```