import mongoose, { Document, Schema } from 'mongoose'
import { ContractStatus } from '../constants/contractStatus'

// 서명 관련 정보
export interface ISignatureInfo {
  signed: boolean // 서명 완료 여부 (true/false)
  signer?: string // 서명자
  certificate?: string // 서명에 사용된 인증서(PEM 형식)
  signatureImageHash?: string // 손글씨 서명 이미지의 해시값(무결성 검증용)
  signatureImageDigital?: string // 손글씨 서명 이미지(base64 인코딩된 PNG 등)
  signature?: string // 계약서 해시값의 전자서명(암호화된 서명값)
  signatureImageHashSignature?: string // 손글씨 해시값의 전자서명(암호화된 서명값)
  qrCode?: string // QR 인증에 사용된 QR 코드 값
}

// 보안 관련 정보
export interface ISecurityInfo {
  fileHash: string
  encryptedAesKeyForUploader: string // JSON: {ciphertext,iv}
  encryptedAesKeyForRecipient: string // JSON: {ciphertext,iv}
}

export interface IContract extends Document {
  title: string // 계약서 제목/원본 파일명
  uploaderId: string // 업로더 ID
  recipientId: string // 수신자 ID
  senderEmail: string //송신자 이메일
  recipientEmail: string // 수신자 이메일
  filePath: string // 업로드된 원본 파일 경로/식별자
  status: ContractStatus
  expirationDate: Date // 계약 유효기간
  received: boolean // 수신함 등록 여부
  deletedBy?: string[] // soft delete: 삭제한 사용자 id 목록
  security: ISecurityInfo
  signature?: ISignatureInfo
  createdAt: Date
  updatedAt: Date
}

const signatureInfoSchema = new Schema<ISignatureInfo>(
  {
    signed: { type: Boolean, default: false },
    signer: { type: String },
    certificate: { type: String },
    signatureImageHash: { type: String },
    signatureImageDigital: { type: String },
    signature: { type: String },
    signatureImageHashSignature: { type: String },
    qrCode: { type: String },
  },
  { _id: false }
)

const securityInfoSchema = new Schema<ISecurityInfo>(
  {
    fileHash: { type: String, required: true },
    encryptedAesKeyForUploader: { type: String, required: true }, // JSON: {ciphertext,iv}
    encryptedAesKeyForRecipient: { type: String, required: true }, // JSON: {ciphertext,iv}
  },
  { _id: false }
)

const contractSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    uploaderId: { type: String, required: true },
    recipientId: { type: String, required: true },
    senderEmail: { type: String },
    recipientEmail: { type: String },
    filePath: { type: String, required: true }, // 파일 저장 위치 참조
    status: {
      type: String,
      required: true,
      default: ContractStatus.Uploaded,
      enum: Object.values(ContractStatus),
    },
    expirationDate: { type: Date, required: true },
    received: { type: Boolean, default: false },
    deletedBy: { type: [String], default: [] },
    security: { type: securityInfoSchema, required: true },
    signature: { type: signatureInfoSchema, default: undefined },
  },
  { timestamps: true }
)

let Contract: mongoose.Model<IContract>

Contract =
  mongoose.models.Contract ||
  mongoose.model<IContract>('Contract', contractSchema)

export default Contract
