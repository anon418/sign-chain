import { NextRequest, NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'
import jwt from 'jsonwebtoken'
import TempUser from '../../../../models/TempUser'
import forge from 'node-forge'
import { encryptEmailNode, decryptEmailNode } from '../../../../utils/crypto'

// CA 키/인증서 로드 (환경변수에서만)
const caPrivateKeyPem: string | undefined = process.env.CA_PRIVATE_KEY
const caCertPem: string | undefined = process.env.CA_CERT

// console.log('[ROUTE] /api/otp/verify/route.ts 파일 로드됨')

if (!caPrivateKeyPem) {
  throw new Error('CA 개인키가 환경변수에 없습니다.')
}
if (!caCertPem) {
  throw new Error('CA 인증서가 환경변수에 없습니다.')
}
const caPrivateKey = forge.pki.privateKeyFromPem(caPrivateKeyPem)
const caCert = forge.pki.certificateFromPem(caCertPem)

function generateKeyPair() {
  const bits = process.env.NODE_ENV === 'production' ? 2048 : 1024
  // console.log(`[KEYGEN] RSA 키쌍 생성 시작 (${bits}비트)`)
  const keypair = forge.pki.rsa.generateKeyPair(bits)
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey)
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey)
  // 디버깅 로그 추가
  // console.log(
  //   '[KEYGEN DEBUG] 생성된 publicKeyPem (앞 50):',
  //   publicKeyPem.slice(0, 50)
  // )
  // console.log(
  //   '[KEYGEN DEBUG] 생성된 privateKeyPem (앞 50):',
  //   privateKeyPem.slice(0, 50)
  // )
  // privateKey에서 publicKey 추출
  let testPublicKeyPem = ''
  try {
    const publicKeyObj = forge.pki.rsa.setPublicKey(
      keypair.privateKey.n,
      keypair.privateKey.e
    )
    testPublicKeyPem = forge.pki.publicKeyToPem(publicKeyObj)
    // console.log('[KEYGEN DEBUG] privateKey에서 추출한 publicKeyPem (앞 50):', testPublicKeyPem.slice(0, 50))
    // console.log('[KEYGEN DEBUG] 공개키 쌍 일치 여부:', publicKeyPem === testPublicKeyPem)
  } catch (e) {
    // console.error('[KEYGEN DEBUG] privateKey에서 publicKey 추출 실패:', e)
  }
  // console.log('[KEYGEN] RSA 키쌍 생성 완료')
  return {
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
  }
}

function issueCertificate(publicKeyPem: string, email: string) {
  const cert = forge.pki.createCertificate()
  cert.publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
  cert.serialNumber = Math.floor(Math.random() * 1e16).toString()
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  const attrs = [{ name: 'commonName', value: email }]
  cert.setSubject(attrs)
  cert.setIssuer(caCert.subject.attributes)
  cert.sign(caPrivateKey)
  return forge.pki.certificateToPem(cert)
}

function ensureEncryptedEmail(email: string) {
  if (typeof email === 'string' && email.includes(':')) return email
  return encryptEmailNode(email)
}

// CORS 프리플라이트 OPTIONS 핸들러 추가
export function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  )
}

export async function POST(req: NextRequest) {
  try {
    await connectDBForApp()
    // 인증 미들웨어 대체: 쿠키에서 토큰 추출 및 검증
    const cookie = req.cookies.get('token')?.value
    if (!cookie) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { message: '서버 설정 오류: JWT_SECRET이 정의되지 않았습니다.' },
        { status: 500 }
      )
    }
    let decoded: any
    try {
      decoded = jwt.verify(cookie, process.env.JWT_SECRET)
    } catch (err: any) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 403 }
      )
    }
    const id = decoded?.id || decoded?.userId
    if (!id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json()
    const { token } = body
    let tempUser = null
    let user = null
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      // console.log('[DB] User.findById 시작:', id)
      user = await User.findById(id)
      // console.log('[DB] User.findById 완료:', user)
    } else {
      // console.log('[DB] TempUser.findOne 시작:', id)
      tempUser = await TempUser.findOne({ email: id })
      // console.log('[DB] TempUser.findOne 완료:', tempUser)
    }
    if (tempUser) {
      // console.log('[VERIFY] TempUser 조회:', tempUser)
      // console.log('[VERIFY] OTP 검증 시작')
      const decryptedOtpSecret = decryptEmailNode(tempUser.otpSecret)
      // console.log('[DEBUG] 복호화된 otpSecret(TempUser):', decryptedOtpSecret)
      const verified = speakeasy.totp.verify({
        secret: decryptedOtpSecret,
        encoding: 'base32',
        token,
        window: 2,
      })
      // console.log(
      //   '[VERIFY] OTP 검증 결과:',
      //   verified,
      //   '입력값:',
      //   token,
      //   '시크릿:',
      //   tempUser.otpSecret
      // )
      if (verified) {
        // 반드시 새 키쌍을 생성하고, publicKey는 DB에, privateKey는 프론트로만 전달
        const { publicKey, privateKey } = generateKeyPair()
        // console.log('[DEBUG] 생성된 publicKey:', publicKey.slice(0, 50))
        // console.log('[DEBUG] 생성된 privateKey:', privateKey.slice(0, 50))
        // tempUser에 혹시 publicKey가 있더라도 절대 사용하지 않음!
        const certificate = issueCertificate(publicKey, tempUser.email)
        let otpSecretToSave = tempUser.otpSecret
        if (!otpSecretToSave.includes(':')) {
          otpSecretToSave = encryptEmailNode(otpSecretToSave)
        }
        // User 생성 시 반드시 새로 생성한 publicKey만 저장
        // console.log(
        //   '[DEBUG] User.create에 저장될 publicKey:',
        //   publicKey.slice(0, 50)
        // )
        const newUser = await User.create({
          email: tempUser.email,
          username: tempUser.username,
          password: tempUser.password,
          otpSecret: otpSecretToSave,
          otpEnabled: true,
          otpVerified: true,
          certificateStatus: 'valid',
          publicKey, // 반드시 새로 생성한 publicKey만!
          certificate,
        })
        // console.log('[DB] User.create 완료:', newUser)
        // console.log('[DB] TempUser.deleteOne 시작')
        await TempUser.deleteOne({ email: tempUser.email })
        // console.log('[DB] TempUser.deleteOne 완료')
        const Notification = require('../../../../models/Notification').default
        // console.log('[DB] Notification.create 시작')
        await Notification.create({
          recipientEmail: ensureEncryptedEmail(
            decryptEmailNode(newUser.email).trim().toLowerCase()
          ),
          message: `회원가입: ${new Date().toLocaleString('ko-KR', {
            hour12: false,
          })}`,
          timestamp: new Date(),
          read: false,
          type: 'system',
        })
        // console.log('[DB] Notification.create 완료')
        const newToken = jwt.sign(
          {
            id: newUser._id,
            email: decryptEmailNode(newUser.email).trim().toLowerCase(),
            username: newUser.username,
            otpVerified: newUser.otpVerified,
            certificateStatus: newUser.certificateStatus,
          },
          process.env.JWT_SECRET as string,
          { expiresIn: '1h' }
        )
        const isProduction = process.env.NODE_ENV === 'production'
        // console.log(
        //   '[DEBUG] 프론트로 응답할 privateKey:',
        //   privateKey.slice(0, 50)
        // )
        const response = NextResponse.json({
          message: 'OTP 인증 성공',
          certificate,
          privateKey, // 반드시 쌍이 맞는 privateKey만 전달
          publicKey, // publicKey도 반드시 포함
          userId: newUser._id,
          redirectTo: '/contract',
        })
        response.cookies.set('token', newToken, {
          httpOnly: true,
          path: '/',
          maxAge: 3600,
          secure: isProduction,
          sameSite: isProduction ? 'strict' : 'lax',
        })
        return response
      } else {
        // console.log('[VERIFY] OTP 인증 실패:', token)
        return NextResponse.json({ message: 'OTP 인증 실패' }, { status: 400 })
      }
    } else if (user) {
      // console.log('[VERIFY] User 조회:', user)
      if (!user.otpSecret) {
        return NextResponse.json(
          { message: 'OTP 시크릿이 없습니다.' },
          { status: 400 }
        )
      }
      // console.log('[VERIFY] OTP 검증 시작(User)')
      const decryptedOtpSecret = decryptEmailNode(user.otpSecret)
      // console.log('[DEBUG] 복호화된 otpSecret(User):', decryptedOtpSecret)
      const verified = speakeasy.totp.verify({
        secret: decryptedOtpSecret,
        encoding: 'base32',
        token,
        window: 2,
      })
      // console.log('[VERIFY] OTP 검증 결과(User):', verified)
      if (verified) {
        user.otpVerified = true
        user.otpEnabled = true
        await user.save()
        const newToken = jwt.sign(
          {
            id: user._id,
            email: (user.email.includes(':')
              ? decryptEmailNode(user.email)
              : user.email
            )
              .trim()
              .toLowerCase(),
            username: user.username,
            otpVerified: user.otpVerified,
            certificateStatus: user.certificateStatus,
          },
          process.env.JWT_SECRET as string,
          { expiresIn: '1h' }
        )
        const isProduction = process.env.NODE_ENV === 'production'
        const response = NextResponse.json({
          message: 'OTP 인증 성공',
          userId: user._id,
          redirectTo: '/contract',
        })
        response.cookies.set('token', newToken, {
          httpOnly: true,
          path: '/',
          maxAge: 3600,
          secure: isProduction,
          sameSite: isProduction ? 'strict' : 'lax',
        })
        return response
      } else {
        // console.log('[VERIFY] OTP 인증 실패(User):', token)
        return NextResponse.json({ message: 'OTP 인증 실패' }, { status: 400 })
      }
    } else {
      // console.log('[VERIFY] 임시 회원 정보/사용자 정보 없음:', id)
      return NextResponse.json(
        { message: '임시 회원 정보 또는 사용자 정보가 없습니다.' },
        { status: 404 }
      )
    }
  } catch (err) {
    // console.error('[OTP VERIFY] 서버 오류:', err)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
