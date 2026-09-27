import { generateKeyPairSync, sign } from "node:crypto"
import {
    encodeBool,
    encodeBytes,
    encodeInt,
    encodeMap,
    encodeString,
    encodeTuple
} from "@helios-lang/cbor"
import { bytesToHex, hexToBytes } from "@helios-lang/codec-utils"
import { makePubKey, makeShelleyAddress } from "@helios-lang/ledger"

/** Test-only CIP-30 wallet; native crypto signs independently of the verifier. */
export function makeTestWallet() {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519")
    const pub = makePubKey(
        Array.from(Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url"))
    )
    const address = makeShelleyAddress(false, pub.hash())
    const protectedHeader = encodeMap([
        [encodeInt(1), encodeInt(-8)],
        [encodeString("address"), encodeBytes(address.bytes)]
    ])
    const key = bytesToHex(
        encodeMap([
            [encodeInt(1), encodeInt(1)],
            [encodeInt(3), encodeInt(-8)],
            [encodeInt(-1), encodeInt(6)],
            [encodeInt(-2), encodeBytes(pub.bytes)]
        ])
    )
    return {
        address: bytesToHex(address.bytes),
        signData(payloadHex) {
            const payload = hexToBytes(payloadHex)
            const message = encodeTuple([
                encodeString("Signature1"),
                encodeBytes(protectedHeader),
                encodeBytes([]),
                encodeBytes(payload)
            ])
            const signature = sign(null, Buffer.from(message), privateKey)
            return {
                key,
                signature: bytesToHex(
                    encodeTuple([
                        encodeBytes(protectedHeader),
                        encodeMap([[encodeString("hashed"), encodeBool(false)]]),
                        encodeBytes(payload),
                        encodeBytes(Array.from(signature))
                    ])
                )
            }
        }
    }
}
