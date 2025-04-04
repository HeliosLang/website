---
sidebar_position: 5
sidebar_label: Values
---
# Function values

Functions are first-class citizens in Helios and can be used as values. This means:

**Functions can be passed as arguments**

```helios
even_numbers = ([]Int{1, 2, 3, 4, 5, 6}).filter(is_even) // [2, 4, 6]
```

**Functions can be returned**

```helios
add_a = (a: Int) -> (Int) -> Int { (b: Int) -> {a + b} }
```

> **Note**: functions aren't entirely first-class to be precise. Functions can't be stored in containers, nor in structs/enums.