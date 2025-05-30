---
title: TxInput
sidebar_label: TxInput
sidebar_class_name: type_badge
---
# <span className="type_badge">TxInput</span>

Represents a **transaction input**.

## Associated functions

### `from_data`

```helios
TxInput::from_data(data: Data) -> TxInput
```

### `new`

Construct a `TxInput` instance.

```helios
TxInput::new(
    output_id: TxOutputId,
    output:    TxOutput
) -> TxInput
```

## Getters

### `address`

Shortcut for `tx_input.output.address`:

```helios
tx_input.address -> Address
```

### `datum`

Shortcut for `tx_input.output.datum`:

```helios
tx_intput.datum -> OutputDatum
```

### `output_id`

Returns the [`TxOutputId`](./txoutputid.md) of the underlying UTxO.

```helios
tx_input.output_id -> TxOutputId
```

### `output`

Returns the underlying UTxO as a [`TxOutput`](./txoutput.md).

```helios
tx_input.output -> TxOutput
```

### `value`

Shortcut for `tx_input.output.value`:

```helios
tx_intput.value -> Value
```

## Operators

### `==`

```helios
TxInput == TxInput -> Bool
```

### `!=`

```helios
TxInput != TxInput -> Bool
```

## Methods

### `serialize`

```helios
tx_input.serialize() -> ByteArray
```