---
sidebar_position: 4
sidebar_label: Void
---
# Void functions

Functions that are composed of only `print`, `error`, `assert`, and `if-else`/`switch` expressions there-of, return void (`()`). These kinds of functions can't be called in assignments.

```helios
func assert_even(n: Int) -> () {
  assert(n % 2 == 0, "not even")
}
```

The syntax for calling user-defined void functions is the same as for `print`, `error` and `assert`:

```helios
spending my_validator

import { tx } from ScriptContext

func main(_, _) -> () {
  assert_even(tx.outputs.length)
}
```