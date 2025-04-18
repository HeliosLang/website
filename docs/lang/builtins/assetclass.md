---
title: AssetClass
sidebar_label: AssetClass
sidebar_class_name: type_badge
---

# <span className="type_badge">AssetClass</span>

Represents a unique token on the blockchain using its [`MintingPolicyHash`](./mintingpolicyhash.md) and its token name (as a [`ByteArray`](./bytearray.md)).

## Associated functions and constants

### `ADA`

Lovelace `AssetClass` (empty [`MintingPolicyHash`](./mintingpolicyhash.md) and empty token name [`ByteArray`](./bytearray.md)):

```helios
AssetClass::ADA -> AssetClass
```

### `new`

Constructs a new `AssetClass` using a [`MintingPolicyHash`](./mintingpolicyhash.md) and a token name [`ByteArray`](./bytearray.md):

```helios
AssetClass::new(
    mph: MintingPolicyHash, 
    token_name: ByteArray
) -> AssetClass
```

### `from_data`

```helios
AssetClass::from_data(data: Data) -> AssetClass
```

## Getters

### `mph`

```helios
asset_class.mph -> MintingPolicyHash
```

### `token_name`

```helios
asset_class.token_name -> ByteArray
```

## Operators

### `==`

```helios
AssetClass == AssetClass -> Bool
```

### `!=`

```helios
AssetClass != AssetClass -> Bool
```

## Methods

### `serialize`

```helios
asset_class.serialize() -> ByteArray
```

### `show`

Returns the hexadecimal representation of the `MintingPolicyHash` and the token name, separated by a period (`.`).

```helios
asset_class.show() -> String
```