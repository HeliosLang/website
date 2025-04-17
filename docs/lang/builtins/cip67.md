---
title: Cip67
sidebar_label: Cip67
sidebar_class_name: namespace_badge
---

# <span className="namespace_badge">Cip67</span>

The `Cip67` namespace contains [CIP67](https://cips.cardano.org/cip/CIP-67) token name prefixes.

Import the `Cip67` namespace to be able to use it:

```helios
import Cip67
```

## `fungible_token_label`

Returns the Cip67 `(333)` (i.e. `#0014df10`) prefix.

```helios
Cip67::fungible_token_label -> ByteArray
```

## `reference_token_label`

Returns the Cip67 `(100)` (i.e. `#000643b0`) prefix.

```helios
Cip67::reference_token_label -> ByteArray
```

## `user_token_label`

Returns the Cip67 `(222)` (i.e. `#000de140`) prefix.

```helios
Cip67::user_token_label -> ByteArray
```