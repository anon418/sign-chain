// 브라우저의 IndexedDB를 이용한 사용자 개인키 및 AES키 안전 저장/복구/관리에 사용
// 개인키(privateKey): 사용자의 전자서명용 개인키를 암호화해서 브라우저에 저장/복호화/삭제/백업/복구
// AES키: 계약서 파일 암호 해제용 AES키를 사용자별·계약서별로 저장/복구/삭제
//'클라이언트 암호키 관리'를 담당하는 핵심 파일

import { openDB } from 'idb'
import { deriveKey, aesEncrypt, aesDecrypt } from './crypto'

const DB_NAME = 'secure-sign-db' //IndexedDB DB 이름
export const STORE_NAME = 'privateKeys' // 개인키 저장소 이름
const DB_VERSION = 1
const AES_STORE = 'aesKeys' // AES키 저장소 이름

// IndexedDB 데이터베이스 초기 생성
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 개인키 저장소 생성
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      // AES키 저장소 생성
      if (!db.objectStoreNames.contains(AES_STORE)) {
        db.createObjectStore(AES_STORE)
      }
    },
  })
}

// 사용자의 개인키를 암호화해서 IndexedDB에 저장
// (userId+password로 암호화)
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

// 저장된 사용자의 개인키를 복호화해서 반환 (password 필요)
export async function loadPrivateKey(
  userId: string,
  password: string
): Promise<string | undefined> {
  const db = await getDB()
  const encrypted = await db.get(STORE_NAME, userId)
  if (!encrypted) {
    console.error('[l장
export async function saveAESKey(
  userId: string,
  contractId: string,
  encryptedAESKey: string,
  iv: string
) {
  const db = await getDB()
  await db.put(AES_STORE, { encryptedAESKey, iv }, `${userId}:${contractId}`)
}

// 저장된 AES키(암호화+iv) 불러오기 -> 파일 복호화 시 다운로드, 열람, 미리보기 등에 사용
export async function loadAESKey(userId: string, contractId: string) {
  const db = await getDB()
  return db.get(AES_STORE, `${userId}:${contractId}`)
}

// AES키 삭제 (로그아웃, 계약서 삭제 등)
export async function deleteAESKey(userId: string, contractId: string) {
  const db = await getDB()
  await db.delete(AES_STORE, `${userId}:${contractId}`)
}
