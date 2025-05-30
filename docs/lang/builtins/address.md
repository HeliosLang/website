---
title: Address
sidebar_label: Address
sidebar_class_name: type_badge
---

# <span className="type_badge">Address</span>

Represents a Cardano address.

## Associated functions

### `from_bytes`

Decodes raw address bytes (see [CIP 19](https://cips.cardano.org/cips/cip19/)).

```helios
Address::from_bytes(bytes: ByteArray) -> Address
```

### `from_data`

```helios
Address::from_data(data: Data) -> Address
```

### `from_hex`

Decodes the hexadecimal encoded bytes of a raw address (see [CIP 19](https://cips.cardano.org/cips/cip19/)).

```helios
Address::from_hex(hex: String) -> Address
```

### `from_validator`

Constructs a validator `Address` with a `Credential` derived from a `ValidatorHash`. 

```helios
Address::from_validator(vh: ValidatorHash) -> Address
```

The resulting `Address` doesn't have a `StakingCredential`.

### `new`

Constructs a new `Address` from a [`Credential`](./credential.md) and an optional [`StakingCredential`](./stakingcredential.md):

```helios
Address::new(
    credential: Credential, 
    staking_credential: Option[StakingCredential]
) -> Address
```

### `new_empty`

Constructs a dummy `Address` with a dummy [`Credential`](./credential.md) whose bytes are all set to `0`, and without a [`StakingCredential`](./stakingcredential.md).

```helios
Address::new_empty() -> Address
```

## Getters

### `credential`

Get the payment [`Credential`](./credential.md) of an `Address`:

```helios
address.credential -> Credential
```

### `staking_credential`

Get the [`StakingCredential`](./stakingcredential.md) of an `Address`:

```helios
address.staking_credential -> Option[StakingCredential]
```

## Operators

### `==`

```helios
Address == Address -> Bool
```

### `!=`

```helios
Address != Address -> Bool
```

## Methods

### `is_staked`

```helios
address.is_staked() -> Bool
```

### `serialize`

```helios
address.serialize() -> ByteArray
```

### `show`

Alias for [`to_hex`](#to_hex).

```helios
address.show() -> String
```

### `to_bytes`

Returns the raw address bytes (see [CIP 19](https://cips.cardano.org/cips/cip19/)).

```helios
address.to_bytes() -> ByteArray
```

### `to_hex`

Encodes the raw address bytes as a hexadecimal `String` (see [CIP 19](https://cips.cardano.org/cips/cip19/)).

```helios
address.to_hex() -> String
```