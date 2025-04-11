---
sidebar_position: 5
---

# Control flow

Helios has conventional `if-else` branching, and also a `switch` expression for enum values.

However, there are no for-loops nor while-loops (looping must be through recursion instead).

## If-else

Helios has conventional `if-else` syntax for branching:

```helios
if (tag == 0) {
  23
} else if (tag == 1) {
  42
} else {
  0
}
```

The last expression in each branch block is implicitly returned.

`if-else` can be used like any other expression:

```helios
x = if (true) {
  42
} else {
  24
}
```

## switch

A `switch` expression is used to perform different actions depending on the [enum](./enums) variant. It is similar to a `switch` statement in C or Go (and dissimilar to a `match` expression in Rust, as Helios doesn't support pattern-matching):

```helios
enum MyEnum {
    A{...} 
    B{...}
    C{...}
}

func main(x: MyEnum) -> Bool {
	x.switch {
		a: A => { 
			... // expression must use a
		},
		B => {
			...
		},
		_ => true // default must come last if all sub-types of MyEnum aren't handled explicitely
		// braces surrounding the cases are optional
	}
}
```