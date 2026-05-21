const IV_LENGTH = 12
const E2EE_TYPE_META = 0
const E2EE_TYPE_CHUNK = 1
const E2EE_TYPE_CHAT = 2

export function useE2EE() {
  const isReady = ref(false)
  let key: CryptoKey | null = null

  async function generateKey() {
    key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    )
  }

  async function exportKey(): Promise<Uint8Array> {
    if (!key) throw new Error('E2EE key not generated')
    const raw = (await crypto.subtle.exportKey('raw', key)) as ArrayBuffer
    return new Uint8Array(raw)
  }

  async function importKey(raw: Uint8Array) {
    key = await crypto.subtle.importKey(
      'raw',
      raw.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  async function encrypt(
    type: number,
    payload: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    if (!key) throw new Error('E2EE key not ready')

    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const prefix = new Uint8Array([type])
    const plaintext = new Uint8Array(prefix.length + payload.byteLength)
    plaintext.set(prefix)
    plaintext.set(new Uint8Array(payload), prefix.length)

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext,
    )

    const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
    result.set(iv)
    result.set(new Uint8Array(ciphertext), IV_LENGTH)
    return result.buffer as ArrayBuffer
  }

  async function decrypt(
    data: ArrayBuffer,
  ): Promise<{ type: number; payload: ArrayBuffer }> {
    if (!key) throw new Error('E2EE key not ready')

    const iv = new Uint8Array(data, 0, IV_LENGTH)
    const ciphertext = new Uint8Array(data, IV_LENGTH)

    const plaintext = (await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )) as ArrayBuffer

    const view = new Uint8Array(plaintext)
    const type = view[0]!
    return { type, payload: plaintext.slice(1) as ArrayBuffer }
  }

  function reset() {
    key = null
    isReady.value = false
  }

  return {
    isReady,
    generateKey,
    exportKey,
    importKey,
    encrypt,
    decrypt,
    reset,
  }
}

export { IV_LENGTH, E2EE_TYPE_META, E2EE_TYPE_CHUNK, E2EE_TYPE_CHAT }
