import mongoose, { Document, Schema } from 'mongoose'

// Notification(알림) 모델: 계약서 관련 알림, 시스템 메시지, 상태 변경 등을 사용자에게 전달
interface INotification extends Document {
  recipientEmail: string // 수신자 이메일(암호화된 값)
  message: string // 알림 메시지(내용)
  timestamp: Date // 알림 생성 시각
  read: boolean // 읽음 여부
  type: string // 알림 유형(system: 시스템, message: 사용자 메시지)
  contractId?: mongoose.Types.ObjectId // 연관된 계약서 ObjectId(선택)
  senderEmail?: string // 송신자 이메일(암호화, 선택)
}

// Notification 스키마 정의
const NotificationSchema: Schema = new Schema({
  recipientEmail: { type: String, required: true }, // 수신자 이메일(암호화)
  message: { type: String, required: true }, // 메시지 내용
  timestamp: { type: Date, default: Date.now }, // 생성 시각
  read: { type: Boolean, default: false }, // 읽음 여부
  type: { type: String, enum: ['system', 'message'], default: 'system' }, // 알림 유형
  contractId: { type: Schema.Types.ObjectId, ref: 'Contract' }, // 연관 계약서
  senderEmail: { type: String }, // 송신자 이메일(암호화, 선택)
})

// Notification 모델(중복 정의 방지)
const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema)

export default Notification
