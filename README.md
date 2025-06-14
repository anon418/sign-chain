# 📄 SignChain

전자계약 플랫폼 – 안전한 회원 인증, 전자서명, 인증서 발급 및 계약 송수신 시스템

## 🚀 주요 기능

- **회원가입/OTP/X.509 인증서 발급**
- **전자서명, QR 본인인증, 손글씨 입력 서명**
- **계약서 업로드, 미리보기, 다운로드, 만료/삭제 처리**
- **실시간 알림 (10초 폴링), 해시체인 로그 기록**
- **모든 민감 정보 암호화 저장 / 보안 중심 UX**

## ✅ 기능 요약

### 🔐 인증 및 보안

- 회원가입 시 공개키/개인키 자동 생성, 인증서 발급
- OTP 필수 (Google Authenticator 기반)
- 비밀번호는 bcrypt + salt 해시 처리
- 개인키는 브라우저(IndexedDB)에만 저장
- JWT + Refresh 토큰 (JTI 적용), SameSite=Strict, Secure, HttpOnly 적용

### 📄 계약서

- zip 업로드 → 파일 암호화(AES-256 + RSA) → 미리보기 생성
- PDF(1p), DOCX/TXT(최대 1000자) 미리보기 제공
- 서명 순서: QR 인증 → 전자서명 → 손글씨
- 만료/거부 시 미리보기/다운로드 불가
- soft delete 방식: 삭제한 사람만 숨김, 양측 삭제 시 완전 삭제

### 🔔 알림 & 로그

- 10초 폴링 실시간 알림
- 모든 활동은 해시체인 로그로 기록 (`previousHash` 사용)

## 해시체인 로그 구조

contractId: A
→ 업로드 (previousHash: "")
→ 다운로드 (previousHash: 업로드 hash)
→ 서명 (previousHash: 다운로드 hash)

## 🗂️ 폴더 구조

- `/app` - 페이지 및 API 라우트
- `/components` - UI 컴포넌트 (예: `ContractPreviewModal`, `NotificationList`)
- `/models` - MongoDB 모델
- `/utils` - 암호화, IndexedDB 등 유틸
- `/public` - 정적 파일

## 🔑 기술 스택

- **Frontend**: Next.js, React, TypeScript, WebCrypto, IndexedDB
- **Backend**: Node.js, MongoDB, Mongoose
- **Security**: AES-GCM, PBKDF2, RSA, X.509, Google OTP, bcrypt
- **기타**: JWT, Refresh Token, 해시체인 로그, Vercel 배포

## ⚙️ 실행 방법

```bash
# 1. 환경변수 설정 (.env)
# 예: JWT_SECRET, AES_KEY, MONGO_URI 등

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev

```
