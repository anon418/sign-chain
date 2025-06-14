import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import Contract from '../../../../models/Contract'
import forge from 'node-forge'

export async function POST(req: NextRequest) {
  await connectDBForApp()
  try {
    const body = await req.json()
    const { contractId } = body
    // 계약서 조회
    const contract = await Contract.findById(contractId)
    if (!contract) {
      return NextResponse.json(
        { signed: false, message: 'Contract not found' },
        { status: 404 }
      )
    }
    // 전자 서명 생성 (hash 또는 fileHash 사용)
    const dataToSign = contract.security?.fileHash
    if (!dataToSign) {
      return NextResponse.json(
        { signed: false, message: 'No contract hash to sign' },
        { status: 400 }
      )
    }
    const privateKeyPem = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n')
    if (!privateKeyPem) {
      return NextResponse.json(
        { message: '서버에 개인키가 설정되어 있지 않습니다.' },
        { status: 500 }
      )
    }
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
    const md = forge.md.sha256.create()
    md.update(dataToSign, 'utf8')
    const signature = privateKey.sign(md)
    // 서명 저장
    if (!contract.signature) contract.signature = { signed: false }
    contract.signature.signed = true
    await contract.save()
    return NextResponse.json({ signed: true })
  } catch (error: any) {
    // console.error('전자 서명 오류:', error)
    return NextResponse.json(
      { signed: false, message: 'Server error' },
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
