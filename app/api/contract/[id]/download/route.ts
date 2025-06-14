import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../../lib/dbConnect'
import Contract from '../../../../../models/Contract'
import { readFileSync } from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import Log from '../../../../../models/Log'

const UPLOAD_DIR = 'uploads'

async function getUserFromRequest(req: NextRequest) {
  const cookie = req.cookies.get('token')?.value
  if (!cookie || !process.env.JWT_SECRET) return null
  try {
    return jwt.verify(cookie, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectDBForApp()
    const user = await getUserFromRequest(req)
    if (!user || typeof user !== 'object') {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    const id = context.params.id
    const contract = await Contract.findById(id)
    if (!contract) {
      return NextResponse.json(
        { message: 'Contract not found' },
        { status: 404 }
      )
    }
    let userId = ''
    if ('id' in user && user.id) {
      userId = (user as any).id
    } else {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    // 만료 상태면 모두 다운로드 불가
    if (contract.status === 'expired') {
      return NextResponse.json(
        { message: '계약서가 만료되었습니다.' },
        { status: 403 }
      )
    }
    // 거부 상태: 업로더(송신자)는 다운로드 가능, 수신자는 불가
    if (
      contract.status === 'rejected' &&
      userId === contract.recipientId?.toString()
    ) {
      return NextResponse.json(
        { message: '계약서가 거부/반려되었습니다.' },
        { status: 403 }
      )
    }

    // 수신자는 signed일 때만 다운로드 가능
    if (
      userId === contract.recipientId?.toString() &&
      contract.status !== 'signed'
    ) {
      return NextResponse.json(
        { message: '모든 인증 및 서명 완료 후 다운로드 가능합니다.' },
        { status: 403 }
      )
    }

    if (
      userId !== contract.recipientId?.toString() &&
      userId !== contract.uploaderId?.toString()
    ) {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const filePath = contract.filePath.replace(/^[/\\]+/, '')
    const resolvedPath = path.resolve(UPLOAD_DIR, filePath)
    let encBuffer
    try {
      encBuffer = readFileSync(resolvedPath)
    } catch (e) {
      return NextResponse.json(
        { message: '파일을 읽을 수 없습니다.' },
        { status: 500 }
      )
    }

    // 로그 기록 (다운로드)
    const lastLog = await Log.findOne({ contractId: contract._id }).sort({
      _id: -1,
    })
    const previousHash = lastLog ? lastLog.hash : ''
    const hash = contract.security?.fileHash || ''
    await Log.create({
      contractId: contract._id,
      filePath: contract.filePath,
      encapsulation: 'download',
      tag: 'contract',
      hash,
      previousHash,
      filename: contract.title,
    })

    const ext = path.extname(contract.title).toLowerCase()
    // Decrypt AES key using user's private key (for uploader or recipient)
    // (Assume privateKeyPem is provided in request header or body for demo)
    let decryptedAesKey, iv
    const isUploader = userId === contract.uploaderId?.toString()
    const isRecipient = userId === contract.recipientId?.toString()
    let encAesKeyObj
    try {
      encAesKeyObj = JSON.parse(
        isUploader
          ? contract.security.encryptedAesKeyForUploader
          : contract.security.encryptedAesKeyForRecipient
      )
    } catch (e) {}
    const privateKeyBase64 = req.headers.get('x-private-key')
    if (!privateKeyBase64) {
      return NextResponse.json(
        { message: '개인키가 필요합니다.' },
        { status: 400 }
      )
    }
    let privateKeyPem
    try {
      privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf-8')
    } catch (e) {}
    // 업로더/수신자 공개키 조회
    const User = require('../../../../../models/User').default
    let usedPublicKey = ''
    try {
      if (isUploader) {
        const uploaderUser = await User.findById(contract.uploaderId)
        usedPublicKey = uploaderUser?.publicKey || ''
      } else {
        const recipientUser = await User.findById(contract.recipientId)
        usedPublicKey = recipientUser?.publicKey || ''
      }
    } catch (e) {}
    // console.log('[DOWNLOAD DEBUG] 사용된 개인키(앞 50):', privateKeyPem.slice(0, 50))
    // console.log('[DOWNLOAD DEBUG] encAesKeyObj:', encAesKeyObj)
    // console.log('[DOWNLOAD DEBUG] encAesKeyObj 전체:', JSON.stringify(encAesKeyObj, null, 2))
    // 복호화 시도
    let aesKeyBytes
    try {
      const forge = require('node-forge')
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
      aesKeyBytes = privateKey.decrypt(
        forge.util.decode64(encAesKeyObj.ciphertext),
        'RSAES-PKCS1-V1_5'
      )
      decryptedAesKey = Buffer.from(aesKeyBytes, 'binary')
      iv = Buffer.from(encAesKeyObj.iv, 'hex')
    } catch (e) {}
    // 파일 복호화 시도
    try {
      const crypto = require('crypto')
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        decryptedAesKey,
        iv
      )
      let decrypted = Buffer.concat([
        decipher.update(encBuffer),
        decipher.final(),
      ])
      let contentType = 'application/octet-stream'
      if (ext === '.pdf') contentType = 'application/pdf'
      else if (ext === '.docx')
        contentType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      return new NextResponse(decrypted, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(
            contract.title
          )}"`,
          'Cache-Control': 'no-store',
        },
      })
    } catch (e) {}

    // === recipient 공개키 쌍 검증 ===
    if (isRecipient) {
      try {
        const forge = require('node-forge')
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
        const publicKey = forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e)
        const publicKeyPem = forge.pki.publicKeyToPem(publicKey)
        const publicKeyHash = require('crypto')
          .createHash('sha256')
          .update(publicKeyPem)
          .digest('hex')
        const expectedHash = (contract as any).security?.recipientPublicKeyHash
        if (publicKeyHash !== expectedHash) {
          return NextResponse.json(
            {
              message:
                '수신자 키 쌍이 일치하지 않습니다. 업로드 시점의 공개키와 현재 개인키가 다릅니다.',
              publicKeyHash,
              expectedHash,
            },
            { status: 400 }
          )
        }
      } catch (e) {
        return NextResponse.json(
          {
            message: '수신자 공개키 해시 검증 오류',
            error: String(e),
          },
          { status: 400 }
        )
      }
    }
  } catch (e) {
    // console.error('[DOWNLOAD API ERROR]', e)
    return NextResponse.json(
      {
        message: '서버 오류',
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
