const crypto = require('crypto')
const readline = require('readline')

// 사용자가 제공한 JSON 백업 데이터
const backup = {
  userId: '684cf654d4e4352cd46c1a12',
  encryptedPrivateKey: {
    iv: 'FrzvNyC0pEk+TVDq',
    data: '1RE0rU93ZBKyxgJt+sYCIDIpz5yQXryQLcgv9ioA7WesHwyanhMWkFRk4q4Xl8lfdKTNMQDFltjZv7+s/hPlaXtwRMZowEbDZnU9Rojnd98mJKsQu2dv0TEntbwvGee7/CkGzmXbuu3v86fnyUTF86WYA0BiuAHrdjSGBnsSq3xpr/ZRNz6d4dkDynjxW940OYoO3zP2u4kAfkkthlr/cBhisop8FkbMr28YDS2Oo9nOMGYFYoE2NXGv1AcW6xlQ7MHW8f0W1kr46QXWB2SDRkyXFkna8EsMyY/Z2ALyck8McOWV4d/2qciFTOUBNIIDh+G2IWECb5VPcVJ26m1czp5NqHR5p+T3nvcNNlgStyMCQau4MfkDZUjvhoQbHonShrim5oecyHUlhiAxmoNUazBf/VD4QTQJOZk7dM140Mai/sUaJv2d7gAfoBzLutCcKuCtkijo0Be3IlQjfUT9S4oHsMp3B/jdrtZx/I22ZYP9nryR1LrDUPdEPmuCPKBl/3whHerXMtANbVP3UiCyCUTRkbDl/iouPjO7Jg637agoTUZf/SmaW4XPtFMJXvbQ/jIivjJrIBjxDPVQ8fXZtfgSGpkKgw0JAjNZLYliN9g9BwWDdfnRdsv5deYyX03+C62ikuU7LJoZAJF0NVyMr3SMK1HpO0bC2RccvtsUuNr62YRlbL9taCZFouxVe2yssbtGN+pf5oGGI14hBVqHA3+R00PbqhZppk/FFV5tOVjdG/JXZyNk0ZPLBaJLCx3lVv/IUt1GLQFuh8Ym4JoiBlcpYSAhFbMnDKP1Bnu1X/r0rMsTKBjBytHkgyFtt9x29SvX4aqZjgoL58900aUyzwHjr6Fqy+Qd1gDwNdmp0oZgaIXOt55ZeaiIPyb/w6ggCXtj2BQ/Di+yDZNbKfYQoxGoBctfNGHYZ8VCRkgsEy/oe843QeLao7496zYpJWQKyuPUc+Tvmy5/DRysI8m8u2PC2afUG89bp2Cbilzz9C8kinqryuppwr2EaHSGQC6Nk+/+ZaCYf7fEsnESWKGbdqXi+dYpVF4dj+jqzyeYtfRVFBWHOojenTkrLSQNENZ5R87oN9diprPXLUydUXwpBCwKJqSLBcG2jZxSbZN7czPKDGhMbZip8kHqpWM1ix6WgC+yw4GOLQulV+KBe7gAVm46/P6MrJj3q5cBxRrhkmh1MV+AMmr8E52XEuSiZxi3+cP4rQpG',
  },
}

function decryptPrivateKeyFromBackup(encrypted, password, userId) {
  // PBKDF2로 키 파생 (SHA-256, 100,000회, 32바이트)
  const key = crypto.pbkdf2Sync(
    password,
    Buffer.from(userId, 'utf8'),
    100000,
    32,
    'sha256'
  )
  // iv를 base64로 디코딩
  const iv = Buffer.from(encrypted.iv, 'base64')
  const data = Buffer.from(encrypted.data, 'base64')
  // 마지막 16바이트가 authTag
  const authTag = data.slice(data.length - 16)
  const encryptedText = data.slice(0, data.length - 16)
  // AES-256-GCM 복호화 (authTag 있음)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedText, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// 비밀번호 입력받기
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
rl.question('비밀번호를 입력하세요: ', (password) => {
  try {
    const pem = decryptPrivateKeyFromBackup(
      backup.encryptedPrivateKey,
      password,
      backup.userId
    )
    console.log('\n복호화된 PEM:\n', pem)
    // forge로 파싱 및 공개키 추출 테스트
    const forge = require('node-forge')
    console.log('[DEBUG] forge 모듈 로드 성공')
    const privateKey = forge.pki.privateKeyFromPem(pem)
    console.log('[DEBUG] privateKey 객체:', privateKey)
    if (!privateKey.publicKey) {
      console.error('[DEBUG] privateKey.publicKey가 없습니다!')
      // publicKey 직접 생성
      const publicKey = forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e)
      const publicKeyPem = forge.pki.publicKeyToPem(publicKey)
      console.log('[DEBUG] publicKeyPem (수동 생성):', publicKeyPem)
    } else {
      const publicKeyPem = forge.pki.publicKeyToPem(privateKey.publicKey)
      console.log('[DEBUG] publicKeyPem:', publicKeyPem)
    }
  } catch (e) {
    console.error('복호화 실패:', e.message)
  }
  rl.close()
})
