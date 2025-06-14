# 📄 Secure E-Contract Platform

**전자계약 플랫폼 - 안전한 회원 인증, 전자서명, 인증서 발급 및 계약 송수신 시스템**

---

## 🚀 서비스 개요

이 플랫폼은 **전자계약의 보안성과 실시간성**을 모두 갖춘 전자계약 서비스입니다. 회원 인증, OTP, X.509 인증서, 전자서명, 해시체인 기반 로그, 실시간 알림, 미리보기/다운로드/서명 등 전자계약에 필요한 모든 기능을 제공합니다.

- **개인정보/계약서/키 등 모든 민감 정보 암호화 저장**
- **실시간 알림, 직관적 UX, 강력한 보안**
- **Vercel 등 클라우드 환경에 최적화된 서버리스 구조**

---

## ✅ 주요 기능 요약

### 1. 회원가입/로그인/OTP/인증서

- 이메일/아이디/비밀번호/OTP로 회원가입, Google OTP 기반 2차 인증 필수
- 회원가입 시 공개키/개인키 쌍 자동 생성, X.509 인증서 발급
- 비밀번호는 bcrypt + salt로 안전하게 해시 저장
- 개인키는 브라우저(IndexedDB)에 암호화 저장, 서버는 알 수 없음
- OTP 인증 성공 시에만 사용자 DB(User)에 등록, 실패 시 TempUser에서 자동 삭제(TTL 5분)

### 2. 계약서 송수신/서명/미리보기/다운로드

- zip 파일 업로드 → 서버에서 추출/암호화(SHA-256, AES-256, RSA)/미리보기 생성
- 미리보기: PDF(1페이지), DOCX/TXT(1000자)
- 송신자는 언제든 다운로드, 수신자는 모든 인증/서명 후 다운로드 가능
- 만료시 미리보기/다운로드/서명 불가, 안내 모달 표시
- 서명 플로우: QR 인증 → 전자서명 → 손글씨 입력
- 계약 만료는 API 호출(로그인/조회 시 자동 만료 처리)로 관리

### 3. 실시간 알림/로그

- 10초 폴링, 종/메시지 아이콘, 읽지 않은 알림 개수 표시
- 모든 행위(열람, 서명, 검증 등)는 해시체인 기반 로그로 저장

### 4. 보안/UX

- 모든 민감 정보(이메일, 계약서, 키 등)는 AES 등으로 암호화 저장
- 회원탈퇴 시 개인키/토큰/IndexedDB 완전 삭제
- 인증서 만료/계약서 만료/거부 시 UX 안내 및 리디렉션

---

## 🗂️ 폴더 구조 및 주요 컴포넌트

- `/app` : Next.js API 라우트, 페이지(홈, 소개, 로그인, 회원가입, 계약함 등)
- `/components` : UI 컴포넌트 (ContractPreviewModal, NotificationList 등)
- `/models` : Mongoose 모델 (User, Contract, Log, Notification 등)
- `/utils` : 암호화, IndexedDB, 다운로드 등 유틸 함수
- `/constants` : 계약 상태 등 상수
- `/public` : 정적 파일

### 주요 컴포넌트

- `ContractPreviewModal.tsx` : 계약서 미리보기/서명/다운로드/만료 안내 모달
- `NotificationList.tsx` : 실시간 알림 목록
- `ContractSignFlow.tsx` : QR/전자서명/손글씨 서명 플로우
- `ConfirmModal.tsx` : 만료/거부/확인 안내 모달

---

## 🔑 보안 구조

- **이메일 등 개인정보**: DB에 AES 암호화 저장, 서버/프론트에서 복호화
- **계약서 파일**: 업로드 시 AES-256으로 암호화, 키는 RSA로 이중 암호화
- **비밀번호**: bcrypt + salt 해시 저장
- **JWT**: email은 평문(복호화된 값)으로 발급, 인증/인가에 사용, JTI/리프레시 토큰 적용(토큰 재사용 방지)
- **로그**: 해시체인 기반, 모든 행위는 이전 해시 포함해 저장
- **회원탈퇴**: 개인키/토큰/IndexedDB 완전 삭제
- **환경변수**: 모든 키/시크릿은 .env로 관리, 프론트 접근 필요한 값은 NEXT*PUBLIC* 접두사 사용

---

## 📄 계약서 미리보기/다운로드/삭제/상태 정책

- **미서명(uploaded)**: 송신자/수신자 모두 미리보기 가능, 다운로드는 송신자만 가능(수신자는 인증/서명 전에는 불가)
- **서명완료(signed)**: 송신자/수신자 모두 미리보기/다운로드 가능
- **거부(rejected)**: 송신자는 미리보기/다운로드 가능, 수신자는 모두 불가
- **만료(expired)**: 송신자/수신자 모두 미리보기/다운로드 불가
- **삭제(soft delete)**: 삭제한 측만 리스트/상세/미리보기/다운로드 모두 숨김, 상대방은 계속 볼 수 있음. 양쪽 모두 삭제 시 완전 삭제(DB에서 제거)
- **모든 상태 변화는 DB와 프론트에 즉시 반영**

- 미리보기는 PDF(1페이지), DOCX/TXT(1000자)만 지원
- 서명 플로우: QR 인증 → 전자서명 → 손글씨 입력
- 만료일이 지난 계약은 접근 시 DB와 프론트 모두 expired로 즉시 반영

---

## 🔔 실시간 알림/로그

- **알림**: 10초 폴링, 종/메시지 아이콘, 읽지 않은 알림 개수 표시
- **로그**: 모든 계약 행위(업로드, 다운로드, 서명 등)는 해시체인 로그로 저장

---

## ⚙️ 기술 스택

- **Frontend**: React, Next.js, TypeScript, IndexedDB, WebCrypto
- **Backend**: Node.js, MongoDB, Mongoose, JWT, bcrypt
- **Security**: AES-GCM, PBKDF2, RSA, X.509, SHA-256, Google OTP, bcrypt+salt
- **Real-Time**: Polling 기반 알림(10초)
- **배포**: Vercel(Serverless), .env 환경변수

---

## 🏁 시작하기

1. `.env` 파일에 환경변수 설정 (MongoDB, JWT, EMAIL_AES_KEY 등)
2. `npm install`으로 의존성 설치
3. `npm run dev`로 개발 서버 실행
4. Vercel 배포 시 환경변수 설정

---

## 🧩 주요 컴포넌트별 설명

- `ContractPreviewModal.tsx` : 계약서 미리보기/다운로드/서명/만료 안내 담당
- `NotificationList.tsx` : 실시간 알림 목록 표시, 읽음/삭제/실시간 갱신 지원
- `ContractSignFlow.tsx` : QR 인증, 전자서명, 손글씨 서명 등 계약서 서명 플로우 담당
- `ConfirmModal.tsx` : 만료/거부/확인 등 안내 모달, UX 흐름 제어
- 기타: Navbar, ContractList, ContractUploadForm 등 송신함/수신함/업로드/네비게이션 등 담당

---

## 📌 예시 서비스 흐름

1. 회원가입 (이메일, 아이디, 비밀번호) → OTP 발급
2. OTP 인증 성공 → 공개키/개인키 + 인증서 생성 → DB 등록
3. 로그인 → OTP 입력 → 성공 → contract/page 이동
4. 계약서 업로드 → 암호화 및 전송 → 수신자 알림 → 수신 확인
5. 수신자 무결성 검증 → QR 본인 인증 → 전자서명 및 손글씨 서명
6. 모든 활동은 로그 및 알림으로 기록, 즉시 DB에 저장
7. 수신함/송신함: 미리보기(모두), 다운로드(송신자만/수신자는 인증 후), 삭제(soft delete)
8. 서명 확인은 실시간 반영, 수신 취소/삭제/탈퇴 시 rejected, 만료 시 expired, 업로드만 했을 시 uploaded
9. 모든 상태 변화는 DB와 프론트에 즉시 반영
10. JWT/Refresh Token(JTI)로 안전한 인증/세션 관리, 비밀번호는 bcrypt+salt 해시 저장
11. 만료일이 지난 계약은 접근 시 DB와 프론트 모두 expired로 즉시 반영
12. 알림/로그는 10초 폴링으로 실시간 반영

---

## 🔒 인증/보안 정책 보강

- Refresh Token은 httpOnly 쿠키로 저장, jti로 재사용 방지
- /api/auth/refresh에서 갱신, jti 일치 여부로 보안 강화
- authFetch 등에서 자동 갱신 처리
- 쿠키 SameSite=Strict: 타 사이트에서의 요청(즉, CSRF 공격)에는 쿠키가 자동으로 전송되지 않으므로, CSRF 방지 효과
- HttpOnly: 자바스크립트로 쿠키 접근 불가(클라이언트 XSS 방지)
- Secure: HTTPS에서만 쿠키 전송

---

## 🔗 해시체인 로그 구조 예시

- contractId: A
  - 업로드 → previousHash: ""
  - 다운로드 → previousHash: (업로드의 hash)
  - 미리보기 → previousHash: (다운로드의 hash)
- contractId: B
  - 업로드 → previousHash: ""
  - 다운로드 → previousHash: (업로드의 hash)
- contractId가 다르면 체인이 이어지지 않음. contractId가 같고, 활동이 연속되면 previousHash가 계속 이어짐.

---

## 🛠️ 환경변수 자동 생성

- scripts/genSecrets.js로 .env에 필요한 보안 키/시크릿을 안전하게 자동 생성 가능
- 예: LOCAL_KEY, LOCAL_SALT, JWT_SECRET, REFRESH_JWT_SECRET, AES_KEY 등
