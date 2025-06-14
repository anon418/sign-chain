export async function deriveKey(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function aesEncrypt(
  plain: string,
  key: CryptoKey
): Promise<{ iv: string; data: string }> {
  if (!window.crypto?.subtle)
    throw new Error('이 브라우저는 WebCrypto를 지원하지 않습니다.')
  const enc = new TextEncoder()
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plain)
  )
  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  }
}

export async function aesDecrypt(
  encrypted: { iv: string; data: string },
  key: CryptoKey
): Promise<string> {
  if (!window.crypto?.subtle)
    throw new Error('이 브라우저는 WebCrypto를 지원하지 않습니다.')
  const dec = new TextDecoder()
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0))
  const data = Uint8Array.from(atob(encrypted.data), (c) => c.charCodeAt(0))
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  return dec.decode(decrypted)
}

// Node.js (server) email encryption/decryption for API routes
let nodeCrypto: typeof import('crypto') | undefined = undefined
if (typeof window === 'undefined') {
  nodeCrypto = require('crypto')
}

const EMAIL_ALGO = 'aes-256-cbc'
const EMAIL_IV_LENGTH = 16

export function encryptEmailNode(email: string): string {
  if (!nodeCrypto) throw new Error('Node.js crypto not available')
  const key = Buffer.from(process.env.EMAIL_AES_KEY as string, 'hex')
  const iv = (nodeCrypto as typeof import('crypto')).randomBytes(
    EMAIL_IV_LENGTH
  )
  const cipher = (nodeCrypto as typeof import('crypto')).createCipheriv(
    EMAIL_ALGO,
    key,
    iv
  )
  let encrypted = cipher.update(email, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decryptEmailNode(encrypted: string): string {
  if (!nodeCrypto) throw new Error('Node.js crypto not available')
  const key = Buffer.from(process.env.EMAIL_AES_KEY as string, 'hex')
  const [ivHex, encryptedData] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = (nodeCrypto as typeof import('crypto')).createDecipheriv(
    EMAIL_ALGO,
    key,
    iv
  )
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// 로컬스토리지용 간단 암호화 (앱 고정 키)
const LOCAL_KEY = process.env.NEXT_PUBLIC_LOCAL_KEY || '' // .env에서 관리
const LOCAL_SALT = process.env.NEXT_PUBLIC_LOCAL_SALT || '' // .env에서 관리

export async function getLocalStorageKey() {
  return deriveKey(LOCAL_KEY, LOCAL_SALT)
}

export async function encryptLocal(plain: string): Promise<string> {
  const key = await getLocalStorageKey()
  const { iv, data } = await aesEncrypt(plain, key)
  return JSON.stringify({ iv, data })
}

export async function decryptLocal(cipher: string): Promise<string> {
  try {
    console.log('[decryptLocal] 입력값:', cipher)
    const key = await getLocalStorageKey()
    const parsed = JSON.parse(cipher)
    console.log('[decryptLocal] 파싱된 iv:', parsed.iv)
    console.log('[decryptLocal] 파싱된 data:', parsed.data)
    const result = await aesDecrypt({ iv: parsed.iv, data: parsed.data }, key)
    console.log('[decryptLocal] 복호화 결과:', result)
    return result
  } catch (e) {
    console.error('[decryptLocal] 복호화 중 에러:', e)
    throw e
  }
}
