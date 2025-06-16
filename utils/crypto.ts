// 비밀번호와 솔트를 이용해 PBKDF2로 AES-GCM 256비트 암호화 키를 파생
// (계약서 저장/다운로드, 개인키 암호화/복호화 등에서 사용)
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
  )v(
    EMAIL_ALGO,
}

// AES-GCM 방식으로 문자열을 암호화 (iv와 암호문 반환)
// 계약서 업로드 시 파일, 개인키, 이메일 등 다양한 데이터 암호화에 사용
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

// Node.js 환경에서 암호화된 이메일을 복호화
// 서버에서 이메일 주소를 안전하게 복호화할 때 사용 (DB → 화면 등)
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
  decrypted += decipher.용
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
