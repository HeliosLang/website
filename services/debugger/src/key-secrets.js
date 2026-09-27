const encoder = new TextEncoder()
const encode = (bytes) => btoa(String.fromCharCode(...bytes))
const decode = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
async function encryptionKey(env) {
    const bytes = decode(env.DEBUGGER_KEY_ENCRYPTION_KEY ?? "")
    if (bytes.length !== 32) throw new Error("Invalid debugger encryption key")
    return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
        "encrypt",
        "decrypt"
    ])
}
export async function encryptKey(env, id, wallet, secret) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
            additionalData: encoder.encode(JSON.stringify([id, wallet]))
        },
        await encryptionKey(env),
        encoder.encode(secret)
    )
    return JSON.stringify({
        version: 1,
        iv: encode(iv),
        ciphertext: encode(new Uint8Array(ciphertext))
    })
}
export async function decryptKey(env, row) {
    const value = JSON.parse(row.encrypted_secret)
    if (value.version !== 1)
        throw new Error("Unsupported key encryption version")
    const plaintext = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: decode(value.iv),
            additionalData: encoder.encode(JSON.stringify([row.id, row.wallet]))
        },
        await encryptionKey(env),
        decode(value.ciphertext)
    )
    return new TextDecoder().decode(plaintext)
}
