#!/usr/bin/env node
const crypto = require('crypto')

function genLocal() {
  const key = crypto.randomBytes(32).toString('hex')
  const salt = crypto.randomBytes(16).toString('hex')
  console.log('LOCAL_KEY=' + key)
  console.log('LOCAL_SALT=' + salt)
}

function genAes() {
  const aesKey = crypto.randomBytes(32).toString('hex')
  console.log('AES_KEY=' + aesKey)
}

function genJwt() {
  const jwtSecret = crypto.randomBytes(32).toString('hex')
  console.log('JWT_SECRET=' + jwtSecret)
}

function genRefreshJwt() {
  const refreshJwtSecret = crypto.randomBytes(32).toString('hex')
  console.log('REFRESH_JWT_SECRET=' + refreshJwtSecret)
}

function usage() {
  console.log('Usage: node genSecrets.js [local|aes|jwt|refresh|all]')
  console.log('  local   : LOCAL_KEY, LOCAL_SALT 출력')
  console.log('  aes     : AES_KEY(64자리 hex) 출력')
  console.log('  jwt     : JWT_SECRET(64자리 hex) 출력')
  console.log('  refresh : REFRESH_JWT_SECRET(64자리 hex) 출력')
  console.log('  all     : 위 4개 모두 출력')
}

const arg = process.argv[2]
if (!arg) {
  usage()
  process.exit(1)
}
if (arg === 'local') genLocal()
else if (arg === 'aes') genAes()
else if (arg === 'jwt') genJwt()
else if (arg === 'refresh') genRefreshJwt()
else if (arg === 'all') {
  genLocal()
  genAes()
  genJwt()
  genRefreshJwt()
} else {
  usage()
  process.exit(1)
}
