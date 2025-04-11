---
sidebar_position: 6
---

# Functions

All Helios functions are pure, which means they don't have side effects (except throwing errors) and always return the same result when given the same arguments.
## Function statements

Function statements are defined using the `func` keyword. Helios has no `return` statement, the last expression in a function is implicitly returned:

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

## First-class citizens

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

## Multiple return values

A Helios function can return multiple values using [tuples](./containers#tuple):

```helios
func swap(a: Int, b: Int) -> (Int, Int) {
  (b, a)
}
```

You can assign to multiple return values using tuple destructuring:

```helios
(a: Int, b: Int) = swap(10, 20) // a==20 && b==10
```

Some of the multiple return values can be discarded with an underscore (`_`):

```helios
(a: Int, _) = swap(10, 20)
```

### Automatic unpacking of tuples

Tuples are automatically unpacked during a function call, in a way that matches the type signature of the function being called:

```helios
(a: Int, b: Int) = swap(swap(10, 20)) // a==10 && b==20
```

## Void return value

Functions don't have to return a value, and can return *void* instead, denoted by empty parentheses: `()`.

Functions that return void can't be called in assignments.

Helios has three builtin functions that return void: `assert`, `error` and `print`.

### Example

```helios
spending my_validator

import { tx } from ScriptContext

func assert_small_even(n: Int) -> () {
  assert(n < 10)
  assert(n % 2 == 0, "not even")
}

func main(_, _) -> () {
  assert_even(tx.outputs.length)
}
```

### `assert`

The builtin `assert` function throws an error if a given expression evaluates to false.

The string message is mandatory, and is useful when matching failure conditions in unit-tests.

```helios
assert(condition, "should be true")
```

### `error`

The builtin `error` function can be used to throw errors inside branches of [`if-else`](./if-else) expressions, and cases of [`switch`](./user-defined-types/enums.md#switch) expressions. At least one branch or case must be non-error-throwing for the `if-else` or `switch` expression to return a non-void value.

```helios
if (cond) {
  true
} else {
  error("my error message")
}
```

```helios
x.switch{
  Buy => true,
  Sell => error("my error message")
}
```

### `print`

The builtin `print` function is useful for debugging. `print(...)` takes a [`String`](./builtins/string.md) argument:

```helios
func main() -> Bool {
  print("Hello world")
  true
}
```

>**Note**: `print` calls are eliminated by the compiler when compiling scripts optimized for production.

## Recursion

A function can call itself recursively:

```helios
func fib(n: Int) -> Int {
  if (n < 1) {
    1
  } else {
    fib(n - 1) + fib(n - 2)
  }
}
```

> **Note:**: a function can only reference itself when recursing. Helios doesn't support hoisting, so mutual recursion by referring to functions defined after the current function in the top-scope isn't possible (for [struct and enum methods](../user-defined-types/methods/index.md) this is however possible):
>
> ```helios
> 01 func a(n: Int) -> Int {
> 02   b(n)                   // ReferenceError: 'b' undefined
> 03 }
> 04
> 05 func b(n: Int) -> Int {
> 06   a(n)                   // ok
> 07 }
>```

### Example: Collatz sequence

A Collatz sequence starts with a given number, `n`, and calculates the next number in the sequence using the following rules:

   1. if `n == 1` the sequence ends
   2. if `n` is even the next number is `n / 2`
   3. if `n` is odd the next number is `(n * 3) + 1`

The Collatz sequence always converges to `1`, regardless the starting number.

```helios

func collatz(n: Int, sequence: []Int) -> []Int {
  updated_sequence = sequence.prepend(n)

  if (n == 1) {
    updated_sequence
  } else if (n % 2 == 0) {
    collatz(n / 2, updated_sequence)
  } else {
    collatz(n * 3 + 1, updated_sequence)
  }
}

x = collatz(10, []Int{}) // x == []Int{10, 5, 16, 8, 4, 2, 1}
```