---
sidebar_label: Endpoints
sidebar_position: 2
---

# API endpoints

Endpoints that return CBOR bytes support several formats depending on the `Accept` header:

* `application/cbor`: raw CBOR bytes
* `application/json`: `{ "cborHex": "<cbor-hex>" }`
* default (`text/plain`): `<cbor-hex>`

The following endpoints are available:

- `GET /api/address/{address}/utxos` – return all UTXOs at the address. Use the optional `asset` query parameter to filter for a specific asset or `lovelace`.
- `POST /api/address/{address}/utxos` – select UTXOs for spending from the address. The request body must be JSON containing `lovelace`, optional `asset`, `minQuantity` and `algorithm` fields. Selected UTXOs are locked for 10 seconds.
- `GET /api/block/{block-hash}` – return CBOR bytes of the block with the given hash.
- `GET /api/block/{block-hash}/tx/{index}` – return CBOR bytes of the transaction at `index` within the block.
- `GET /api/chain/tip` – return the current chain tip information.
- `GET /api/parameters` – return the current network parameters in Helios JSON format.
- `GET /api/policy/{policy}/assets` – list all assets under the policy ID.
- `GET /api/policy/{policy}/asset/{asset-name}/addresses` – list all addresses holding the asset.
- `GET /api/mempool` – list the transaction hashes currently kept in the Iris mempool overlay.
- `POST /api/tx` – submit a transaction. The request body can be raw CBOR (`application/cbor`) or a JSON envelope with a `cborHex` field.
- `GET /api/tx/{tx-hash}` – return CBOR bytes of the transaction with the given hash.
- `GET /api/tx/{tx-hash}/block` – return the block information containing the transaction.
- `GET /api/tx/{tx-hash}/output/{index}` – return CBOR bytes of the specified UTXO.

