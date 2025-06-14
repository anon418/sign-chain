import mongoose, { Schema, Document } from 'mongoose'

// Log(로그) 모델: 계약서의 변경 이력, 파일 업로드/서명/수정 등 모든 상태 변화를 기록
interface ILog extends Document {
  contractId: string // 연관된 계약서의 ObjectId(문서 고유 식별자)
  filePath: string // 관련 파일의 경로(암호화 파일 등)
  encapsulation: string // 이 로그의 캡슐화 유형(예: upload, sign 등)
  tag: string // 태그(예: contract, signature 등)
  hash: string // 현재 상태의 해시값(무결성 검증용)
  previousHash?: string // 이전 로그의 해시값(체인 형태로 연결)
  filename: string // 실제 파일명(사용자에게 보여지는 이름)
}

// Log 스키마 정의
const LogSchema: Schema = new Schema(
  {
    contractId: { type: String, required: true }, // 계약서 ObjectId
    filePath: { type: String, required: true }, // 파일 경로
    encapsulation: { type: String, required: true }, // 캡슐화 유형
    tag: { type: String, required: true }, // 태그
    hash: { type: String, required: true }, // 현재 상태 해시
    previousHash: { type: String }, // 이전 상태 해시
    filename: { type: String, required: true }, // 파일명
  },
  { timestamps: true } // 생성/수정 시각 자동 기록
)

// Log 모델(중복 정의 방지)
const Log = mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema)
export default Log
