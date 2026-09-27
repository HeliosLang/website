import {
    decodeBool,
    decodeTuple,
    decodeBytes,
    decodeMap,
    decodeInt,
    decodeString,
    isInt,
    encodeTuple,
    encodeString,
    encodeBytes
} from "@helios-lang/cbor"
import { bytesToHex } from "@helios-lang/codec-utils"
import {
    decodeShelleyAddress,
    makePubKey,
    makeSignature
} from "@helios-lang/ledger"

const hex = (value) =>
    typeof value === "string" && /^(?:[0-9a-fA-F]{2})+$/.test(value)
/** Verify the ORIGINAL protected-header bytes, never a reconstructed COSE object. */
export function verifyWallet(address, payload, signature, key) {
    if (![address, payload, signature, key].every(hex))
        throw new Error("Invalid hex")
    const entries = decodeMap(key, decodeInt, (bytes) =>
        isInt(bytes) ? decodeInt(bytes) : decodeBytes(bytes)
    )
    const fields = new Map(entries.map(([k, v]) => [Number(k), v]))
    if (fields.get(1) !== 1n || fields.get(3) !== -8n || fields.get(-1) !== 6n)
        throw new Error("Invalid signing key")
    const pubKey = makePubKey(fields.get(-2))
    const [protectedBytes, , signedPayload, sig] = decodeTuple(signature, [
        decodeBytes,
        (bytes) =>
            decodeMap(bytes, decodeString, (bytes) => {
                if (decodeBool(bytes))
                    throw new Error("Hashed payload unsupported")
                return false
            }),
        decodeBytes,
        decodeBytes
    ])
    const headers = new Map(
        decodeMap(
            protectedBytes,
            (bytes) =>
                isInt(bytes)
                    ? decodeInt(bytes).toString()
                    : decodeString(bytes),
            (bytes) => (isInt(bytes) ? decodeInt(bytes) : decodeBytes(bytes))
        )
    )
    if (
        headers.get("1") !== -8n ||
        bytesToHex(headers.get("address")) !== address.toLowerCase() ||
        bytesToHex(signedPayload) !== payload.toLowerCase()
    )
        throw new Error("Challenge mismatch")
    const addr = decodeShelleyAddress(address)
    if (
        addr.spendingCredential.kind !== "PubKeyHash" ||
        !addr.spendingCredential.isEqual(pubKey.hash())
    )
        throw new Error("Key does not own address")
    makeSignature(pubKey, sig).verify(
        encodeTuple([
            encodeString("Signature1"),
            encodeBytes(protectedBytes),
            encodeBytes([]),
            encodeBytes(signedPayload)
        ])
    )
    return bytesToHex(pubKey.hash().bytes)
}
