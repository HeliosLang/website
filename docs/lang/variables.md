---
sidebar_position: 2
---

# Variables

Variables in Helios can be defined inside function bodies using assignment expressions, and at the *top-level* of a script using `const` statements.

## Assignment

Inside a function body, variables are defined using assignment expressions:

```helios
my_number = 42
```

Here `my_number` has value `42`, and has inferred type [`Int`](./builtins/int). 

## Reassignment

A variable can be reassigned (though all values in Helios are immutable).

```helios
my_number = 42;

...

my_number = 0 // reassignment
```

The new value must have the same type. You can reassign a variable inside nested scopes, effectively shadowing the original value. You can also reassign function arguments.

> **Note**: the value of an assignment in a nested scope isn't available in the outer scopes.

## `const` statements

Variables can also be defined at the *top-level* of a script, or inside `struct` or `enum` blocks, with `const` statements:

```helios
const AGE = 123
```

`const` statements can be [`changed`](../sdk/compiler/Program.md#parameters-1) using the Helios API (see [`parameterized contracts`](./validators.md#parameters)).

> **Note**: the right-hand side of `const` can contain complex expressions and even function calls. The compiler is smart enough to evaluate these at compile-time.

### `const` without right-hand-side

The right-hand-side of a `const` statement can be omitted, in which case it *must* have a type annotation, and its value must be set using the Helios API before compiling (see [`program.parameters`](../sdk/compiler/Program.md#parameters-1)):

```helios
const MY_PARAMETER: ValidatorHash
```

## Type annotations

Assignment expressions can optionally include  a *type annotation*:
```helios
list_of_ints: []Int = []Int{1, 1, 2, 3, 5}
```