---
sidebar_position: 1
sidebar_label: Syntax
---
# Function syntax

## Statements

Function statements are defined using the `func` keyword. Helios has no `return` statement, the last expression in a function is *implicitly returned* (like in Rust):

```helios
func add(a: Int, b: Int) -> Int {
    a + b 
}
```

## Anonymous functions

Helios also supports anonymous function expressions. Anonymous function expressions are basically function statements without the `func` keyword: 
```helios
is_even = (n: Int) -> Bool { n % 2 == 0 }
```

The return type of anonymous functions is optional:
```helios
is_even = (n: Int) -> { n % 2 == 0 }
```

> **Note:** function statements can be referenced by their name, returning a function value. This should be preferred to using anonymous functions, as it is more readable.

## Unused arguments

All named function arguments must be used in the function definition. This can be inconvenient when defining callbacks where you want to ignore some of the arguments. For this situation you can use a standalone underscore (`_`), or an underscore prefix:

```helios
// sort a map by only comparing the keys
map.sort((a_key: ByteArray, _, b_key: ByteArray, _b_value_unused) -> Bool {
  a_key < b_key
})
```

Underscores are most commonly used to ignore either the datum or the redeemer in the `main` function of a validator script.

> **Note:** double underscore prefixes are reserved for internal use.

## Optional arguments

Some function arguments can be made optional by specifying default values:

```helios
func incr(a: Int, b: Int = 1) -> Int {
  a + b
}
```

Optional arguments must come after non-optional arguments.

The type signature of a function with optional arguments differs from a regular function:

```helios
fn: (Int, ?Int) -> Int = incr
```

## Named arguments

Similar to literal constructor fields, function arguments can be named in a call:

```helios
func sub(a: Int, b: Int) -> Int {
  a - b
}

sub(b: 1, a: 2) // == 1
```

A function call can't mix named arguments with positional arguments.

Named arguments are mostly used when calling the [`copy()`](../user-defined-types/methods/automatic-methods.md#copy) method.

