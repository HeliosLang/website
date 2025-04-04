---
sidebar_position: 2
---
# Recursion

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

## Example: Collatz sequence

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