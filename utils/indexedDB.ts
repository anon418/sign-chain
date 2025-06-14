import { openDB } from 'idb'
import { deriveKey, aesEncrypt, aesDecrypt } from './crypto'

const DB_NAME = 'secure-sign-db'
export const STORE_NAME = 'privateKeys'
const DB_VERSION = 1
const AES_STORE = 'aesKeys'

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (!db.objectStoreNames.contains(AES_STORE)) {
        db.createObjectStore(AES_STORE)
      }
    },
  })
}

// 개인키 암호화 저장
export async function savePrivateKey(
  userId: string,
  privateKey: string,
  password: string
) {
  console.log(
    '[DEBUG] savePrivateKey - 저장 전 privateKey (앞 50):',
    privateKey.slice(0, 50)
  )
  console.log(
    '[DEBUG] savePrivateKey - 저장 전 privateKey 길이:',
    privateKey.length
  )
  const key = await deriveKey(password, userId)
  const encrypted = await aesEncrypt(privateKey, key)
  console.log(
    '[DEBUG] savePrivateKey - 암호화된 privateKey:',
    JSON.stringify(encrypted).slice(0, 100)
  )
  const db = await getDB()
  await db.put(STORE_NAME, encrypted, userId)
}

// 개인키 복호화 불러오기
export async function loadPrivateKey(
  userId: string,
  password: string
): Promise<string | undefined> {
  const db = await getDB()
  const encrypted = await db.get(STORE_NAME, userId)
  if (!encrypted) return undefined
  const key = await deriveKey(password, userId)
  const decrypted = await aesDecrypt(encrypted, key)
  console.log(
    '[DEBUG] loadPrivateKey - 복호화된 privateKey (앞 50):',
    decrypted.slice(0, 50)
  )
  console.log(
    '[DEBUG] loadPrivateKey - 복호화된 privateKey 길이:',
    decrypted.length
  )
  return decrypted
}

// 개인키 삭제
export async function deletePrivateKey(userId: string) {
  const db = await getDB()
  await db.delete(STORE_NAME, userId)
}

// 개인키 내보내기 (암호화 JSON)
export async function exportPrivateKey(
  userId: string
): Promise<string | undefined> {
  const db = await getDB()
  const encrypted = await db.get(STORE_NAME, userId)
  if (!encrypted) return undefined
  return JSON.stringify({ userId, encryptedPrivateKey: encrypted })
}

// 개인키 복구 (암호화 JSON)
export async function importPrivateKey(json: string) {
  try {
    const { userId, encryptedPrivateKey } = JSON.parse(json)
    if (!userId || !encryptedPrivateKey) throw new Error('Invalid backup file')
    const db = await getDB()
    await db.put(STORE_NAME, encryptedPrivateKey, userId)
    return true
  } catch {
    return false
  }
}

// 저장
export async function saveAESKey(
  userId: string,
  contractId: string,
  encryptedAESKey: string,
  iv: string
) {
  const db = await getDB()
  await db.put(AES_STORE, { encryptedAESKey, iv }, `${userId}:${contractId}`)
}

// 불러오기
export async function loadAESKey(userId: string, contractId: string) {
  const db = await getDB()
  return db.get(AES_STORE, `${userId}:${contractId}`)
}

// 삭제
export async function deleteAESKey(userId: string, contractId: string) {
  const db = await getDB()
  await db.delete(AES_STORE, `${userId}:${contractId}`)
}
