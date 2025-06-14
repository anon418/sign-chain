import { NextRequest, NextResponse } from 'next/server'
import { connectDBForApp } from '../../../../lib/dbConnect'
import User from '../../../../models/User'
import Contract from '../../../../models/Contract'

export async function POST(req: NextRequest) {
  await connectDBForApp()
  try {
    const body = await req.json()
    const { email, hash, contractId, signature } = body
    // 사용자 조회 (공개키 등 필요시)
    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    // 인증서 상태 체크
    if (user.certificateStatus !== 'valid') {
      return NextResponse.json(
        { message: '인증서가 만료(또는 폐기)되어 전자서명이 불가합니다.' },
        { status: 403 }
      )
    }
    // 클라이언트에서 생성된 signature만 저장
    if (contractId && signature) {
      await Contract.findByIdAndUpdate(
        contractId,
        {
          signature: {
            signed: true,
            signer: email,
            // signatureImageDigital 등 필요한 필드만 저장
          },
          status: 'signed',
        },
        { new: true }
      )
    }
    return NextResponse.json({ message: 'Digital signature saved', signature })
  } catch (error: any) {
    console.error('전자 서명 오류:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
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
