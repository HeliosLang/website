---
sidebar_label: Examples
sidebar_position: 3
---

# Using IrisClient

The `@helios-lang/tx-utils` package exposes an `IrisClient` helper for interacting with Iris.

```javascript
import { makeIrisClient } from '@helios-lang/tx-utils'

const client = makeIrisClient('https://your-iris-host', false)

// fetch network parameters
const params = await client.parameters
console.log(params)

// get UTXOs at an address
const address = 'addr_test1...'
const utxos = await client.getUtxos(address)
console.log(utxos)
```

See the `IrisClient.test.js` file in the `tx-utils` repository for more elaborate examples such as submitting transactions or building transaction chains.

