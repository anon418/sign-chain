import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'
import Contract from '../../../../models/Contract'
import Notification from '../../../../models/Notification'
import Log from '../../../../models/Log'
import forge from 'node-forge'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { PDFDocument } from 'pdf-lib'
import mammoth from 'mammoth'
import { encryptEmailNode, decryptEmailNode } from '../../../../utils/crypto'
import AdmZip from 'adm-zip'
import iconv from 'iconv-lite'
import chardet from 'chardet'

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const previewDir = path.join(process.cwd(), 'previews')
if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true })

const allowedExtensions = ['.pdf', '.docx', '.txt']

// 파일 업로드 용량 제한: 20MB (Vercel 호환)
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

// 예시: const form = new formidable.IncomingForm({ maxFileSize: 100 * 1024 * 1024 })
// nginx 등 리버스 프록시: client_max_body_size 100M;

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}

export async function POST(req: NextRequest) {
  await connectDBForApp()
  // 인증 미들웨어 대체: 쿠키에서 토큰 추출 및 검증
  const cookie = req.cookies.get('token')?.value
  if (!cookie) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  let decoded: any
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { message: '서버 설정 오류: JWT_SECRET이 정의되지 않았습니다.' },
        { status: 500 }
      )
    }
    decoded = jwt.verify(cookie, process.env.JWT_SECRET)
  } catch (err: any) {
    return NextResponse.json(
      { message: '유효하지 않은 토큰입니다.' },
      { status: 403 }
    )
  }
  // 파일 및 필드 파싱
  const formData = await req.formData()
  const file = formData.get('file')
  let recipientEmail = formData.get('recipientEmail')
  if (Array.isArray(recipientEmail)) recipientEmail = recipientEmail[0]
  let uploaderId = ''
  if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
    uploaderId = decoded.id
  } else if (
    typeof decoded === 'object' &&
    decoded !== null &&
    '_id' in decoded
  ) {
    uploaderId = decoded._id
  } else if (
    typeof decoded === 'object' &&
    decoded !== null &&
    'userId' in decoded
  ) {
    uploaderId = decoded.userId
  }
  // 파일 유효성 검사
  if (!file || typeof file === 'string' || !('arrayBuffer' in file)) {
    return NextResponse.json({ message: '파일이 필요합니다.' }, { status: 400 })
  }
  // 파일 확장자 체크
  const ext = file.name ? path.extname(file.name).toLowerCase() : ''
  if (ext !== '.zip') {
    return NextResponse.json(
      { message: '압축된 zip 파일만 업로드할 수 있습니다.' },
      { status: 400 }
    )
  }
  // zip 파일에서 원본 파일 추출
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const zip = new AdmZip(fileBuffer)
  const zipEntries = zip.getEntries()
  if (zipEntries.length !== 1) {
    return NextResponse.json(
      { message: 'zip 파일에는 하나의 파일만 포함되어야 합니다.' },
      { status: 400 }
    )
  }
  const originalEntry = zipEntries[0]
  const filename = originalEntry.entryName
  let originalFileBuffer = originalEntry.getData()
  // 파일 확장자 체크 (원본)
  const originalExt = path.extname(filename).toLowerCase()
  if (!allowedExtensions.includes(originalExt)) {
    return NextResponse.json(
      { message: 'PDF, DOCX, TXT 파일만 업로드할 수 있습니다.' },
      { status: 400 }
    )
  }
  // TXT 파일이면 인코딩 감지 후 UTF-8로 변환
  if (originalExt === '.txt') {
    try {
      let encoding =
        chardet.detect(new Uint8Array(originalFileBuffer)) || 'utf-8'
      let decoded = iconv.decode(originalFileBuffer, encoding)
      // 깨진 글자()가 많으면 fallback
      if ((decoded.match(/\ufffd/g) || []).length > 5) {
        const tryEncodings = ['utf-8', 'euc-kr', 'utf16-le', 'utf16-be']
        for (const enc of tryEncodings) {
          if (enc === encoding) continue
          const alt = iconv.decode(originalFileBuffer, enc)
          if (
            (alt.match(/\ufffd/g) || []).length <
            (decoded.match(/\ufffd/g) || []).length
          ) {
            decoded = alt
            break
          }
        }
      }
      originalFileBuffer = Buffer.from(decoded, 'utf-8')
    } catch (e) {
      // fallback: 그냥 utf-8로 시도
      originalFileBuffer = Buffer.from(
        originalFileBuffer.toString('utf-8'),
        'utf-8'
      )
    }
  }
  // 파일 크기 제한 체크
  if (originalFileBuffer.length > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: '파일 용량이 너무 큽니다. 20MB 이하로 업로드 해주세요.' },
      { status: 400 }
    )
  }
  // 이메일 형식 체크
  const emailRegex = /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/
  if (
    !recipientEmail ||
    typeof recipientEmail !== 'string' ||
    !emailRegex.test(recipientEmail)
  ) {
    return NextResponse.json(
      { message: '이메일 형식에 맞지 않습니다. 다시 입력해주세요.' },
      { status: 400 }
    )
  }
  // 업로더 정보
  const uploader = await User.findById(uploaderId)
  if (!uploader || !uploader.publicKey) {
    return NextResponse.json(
      { message: '업로더 공개키가 없습니다.' },
      { status: 400 }
    )
  }
  // DB에 등록된 이메일인지 확인
  const normalizedInput = recipientEmail.trim().toLowerCase()
  const users = await User.find({})
  const recipient = users.find(
    (u) => decryptEmailNode(u.email) === normalizedInput
  )
  if (!recipient) {
    return NextResponse.json(
      { message: '등록되지 않은 사용자입니다. 등록된 이메일을 써주세요.' },
      { status: 404 }
    )
  }
  // 본인 이메일로는 보낼 수 없음
  const normalizedUserEmail = decryptEmailNode(uploader.email)
    .trim()
    .toLowerCase()
  if (normalizedInput === normalizedUserEmail) {
    return NextResponse.json(
      {
        message: '본인 이메일로는 보낼 수 없습니다.',
      },
      { status: 400 }
    )
  }
  // 파일 저장
  // const hash = crypto
  //   .createHash('sha256')
  //   .update(originalFileBuffer as unknown as crypto.BinaryLike)
  //   .digest('hex')
  // AES-256 키/IV 생성 및 파일 암호화
  const aesKey = crypto.randomBytes(32)
  const iv = crypto.randomBytes(16)
  // @ts-ignore
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv)
  // @ts-ignore
  let encrypted = cipher.update(
    originalFileBuffer as unknown as Buffer & string
  )
  // @ts-ignore
  encrypted = Buffer.concat([encrypted, cipher.final()])
  // 암호화 파일 저장
  const encFileName = uuidv4()
  const encFilePath = path.join(uploadDir, encFileName)
  // @ts-ignore
  fs.writeFileSync(encFilePath, encrypted)
  // 암호화된 파일의 해시를 구해서 저장
  // @ts-ignore
  const encFileBuffer = fs.readFileSync(encFilePath)
  // @ts-ignore
  const encHash = crypto
    .createHash('sha256')
    .update(encFileBuffer as unknown as crypto.BinaryLike)
    .digest('hex')
  // 업로더/수신자 공개키로 AES 키 암호화
  const uploaderPublicKey = forge.pki.publicKeyFromPem(
    uploader.publicKey?.replace(/\\n/g, '\n')
  )
  if (!recipient.publicKey) {
    return NextResponse.json(
      { message: '수신자 공개키가 없습니다.' },
      { status: 400 }
    )
  }
  const recipientPublicKey = forge.pki.publicKeyFromPem(
    recipient.publicKey?.replace(/\\n/g, '\n')
  )
  // 더 안전한 변환 방식 사용
  const aesKeyBinary = forge.util.binary.raw.encode(aesKey)
  console.log(
    '[UPLOAD DEBUG] 업로더 공개키(앞 50):',
    uploader.publicKey.slice(0, 50)
  )
  // console.log(
  //   '[UPLOAD DEBUG] 업로더 개인키(앞 50):',
  //   uploader.privateKey ? uploader.privateKey.slice(0, 50) : '없음'
  // )
  const encryptedAesKeyForUploader = JSON.stringify({
    ciphertext: forge.util.encode64(
      uploaderPublicKey.encrypt(aesKeyBinary, 'RSAES-PKCS1-V1_5')
    ),
    iv: iv.toString('hex'),
  })
  const encryptedAesKeyForRecipient = JSON.stringify({
    ciphertext: forge.util.encode64(
      recipientPublicKey.encrypt(aesKeyBinary, 'RSAES-PKCS1-V1_5')
    ),
    iv: iv.toString('hex'),
  })
  console.log(
    '[UPLOAD DEBUG] 업로더 공개키로 암호화한 AES키:',
    encryptedAesKeyForUploader
  )
  // 업로더 개인키로 복호화 테스트 (개발환경에서만, 실제 서비스에서는 주석처리)
  // if (process.env.NODE_ENV !== 'production' && uploader.privateKey) {
  //   try {
  //     const uploaderPrivateKey = forge.pki.privateKeyFromPem(
  //       uploader.privateKey
  //     )
  //     const decryptedAesKeyTest = uploaderPrivateKey.decrypt(
  //       forge.util.decode64(JSON.parse(encryptedAesKeyForUploader).ciphertext),
  //       'RSAES-PKCS1-V1_5'
  //     )
  //     const testResult = decryptedAesKeyTest === aesKeyBinary
  //     console.log(
  //       '[UPLOAD DEBUG] 업로더 개인키 복호화 테스트:',
  //       testResult ? '성공' : '값 불일치'
  //     )
  //   } catch (e) {
  //     console.error('[UPLOAD DEBUG] 업로더 개인키 복호화 테스트 실패:', e)
  //   }
  // }
  // (Note: IUser/User model does not and should not have a privateKey property. All private key logic is handled client-side only.)
  // 디버깅 로그 추가
  console.log('[UPLOAD DEBUG] uploaderId:', uploaderId)
  console.log(
    '[UPLOAD DEBUG] uploader.publicKey(first 50):',
    uploader.publicKey.slice(0, 50) + '...'
  )
  console.log(
    '[UPLOAD DEBUG] encryptedAesKeyForUploader:',
    encryptedAesKeyForUploader
  )
  console.log(
    '[UPLOAD DEBUG] encryptedAesKeyForRecipient:',
    encryptedAesKeyForRecipient
  )
  console.log('[UPLOAD DEBUG] iv:', iv.toString('hex'))
  console.log('[UPLOAD DEBUG] fileHash:', encHash)
  // DB 기록
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + 30)
  const qrCode = uuidv4()
  const plainRecipientEmail = decryptEmailNode(recipient.email)
    .trim()
    .toLowerCase()
  const encryptedRecipientEmail = encryptEmailNode(plainRecipientEmail)
  const recipientPublicKeyHash = crypto
    .createHash('sha256')
    .update(recipient.publicKey || '')
    .digest('hex')
  const createdContract = await Contract.create({
    title: filename,
    uploaderId,
    senderEmail: uploader.email,
    recipientId: recipient._id,
    recipientEmail: encryptedRecipientEmail,
    filePath: encFileName,
    status: 'uploaded',
    expirationDate,
    received: false,
    security: {
      fileHash: encHash,
      encryptedAesKeyForUploader,
      encryptedAesKeyForRecipient,
      recipientPublicKeyHash,
    },
    signature: { qrCode },
    // deletedBy 등은 필요시 추가
  })
  console.log('[UPLOAD DEBUG] createdContract._id:', createdContract._id)
  // Find previous log for this contract
  const lastLog = await Log.findOne({ contractId: createdContract._id }).sort({
    _id: -1,
  })
  const previousHash = lastLog ? lastLog.hash : ''
  await Log.create({
    contractId: createdContract._id,
    filePath: encFileName,
    encapsulation: 'upload',
    tag: 'contract',
    hash: encHash,
    previousHash,
    filename: file.name,
  })

  // previews 폴더에만 미리보기 파일을 저장하도록 정리
  // 미리보기 파일 생성
  let previewCreated = false
  let previewError = ''
  try {
    const previewPath = path.join(
      previewDir,
      `${createdContract._id}.${originalExt.replace('.', '')}`
    )
    if (originalExt === '.pdf') {
      // PDF: 1페이지만 평문으로 저장
      const pdfDoc = await PDFDocument.load(
        originalFileBuffer as unknown as ArrayBuffer
      )
      const newPdf = await PDFDocument.create()
      const [firstPage] = await newPdf.copyPages(pdfDoc, [0])
      newPdf.addPage(firstPage)
      const pdfBytes = await newPdf.save()
      try {
        // @ts-ignore
        fs.writeFileSync(previewPath, Buffer.from(pdfBytes))
      } catch (err) {
        console.error('미리보기 파일 생성 실패:', err)
      }
    } else if (originalExt === '.txt') {
      // TXT: 앞 1000자만 평문으로 저장 (인코딩 감지 후 UTF-8 변환, fallback 포함)
      let text = ''
      try {
        let encoding =
          chardet.detect(new Uint8Array(originalFileBuffer)) || 'utf-8'
        text = iconv.decode(originalFileBuffer, encoding).slice(0, 1000)
        // 깨진 글자()가 많으면 fallback
        if ((text.match(/\ufffd/g) || []).length > 5) {
          const tryEncodings = ['utf-8', 'euc-kr', 'utf16-le', 'utf16-be']
          for (const enc of tryEncodings) {
            if (enc === encoding) continue
            const alt = iconv.decode(originalFileBuffer, enc).slice(0, 1000)
            if (
              (alt.match(/\ufffd/g) || []).length <
              (text.match(/\ufffd/g) || []).length
            ) {
              text = alt
              break
            }
          }
        }
      } catch {
        text = originalFileBuffer.toString('utf-8').slice(0, 1000)
      }
      fs.writeFileSync(previewPath, text, { encoding: 'utf-8' })
    } else if (originalExt === '.docx') {
      // DOCX: 앞 1000자만 평문으로 저장 (mammoth로 텍스트 추출)
      const result = await mammoth.extractRawText({
        buffer: originalFileBuffer,
      })
      const text = result.value.slice(0, 1000)
      try {
        // @ts-ignore
        fs.writeFileSync(previewPath, text)
      } catch (err) {
        console.error('미리보기 파일 생성 실패:', err)
      }
    }
    previewCreated = fs.existsSync(previewPath)
  } catch (e) {
    previewError = String(e)
  }

  // 계약 업로드 후 수신자에게 알림 생성
  await Notification.create({
    recipientEmail: encryptedRecipientEmail,
    message: `${filename} 계약서가 도착했습니다.`,
    type: 'message',
    timestamp: new Date(),
    read: false,
    contractId: createdContract._id,
  })

  return NextResponse.json({
    message: '성공적으로 계약서를 수신했습니다.',
    hash: encHash,
    previewCreated,
    previewError,
  })
}
