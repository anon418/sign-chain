import React from 'react'
import {
  FaUserShield as RawFaUserShield,
  FaFileSignature as RawFaFileSignature,
  FaBell as RawFaBell,
  FaLock as RawFaLock,
  FaUsers as RawFaUsers,
  FaCogs as RawFaCogs,
  FaFolderOpen as RawFaFolderOpen,
  FaRegEye as RawFaRegEye,
} from 'react-icons/fa'

// 타입 캐스팅
const FaUserShield = RawFaUserShield as React.FC<{ color?: string }>
const FaFileSignature = RawFaFileSignature as React.FC<{ color?: string }>
const FaBell = RawFaBell as React.FC<{ color?: string }>
const FaLock = RawFaLock as React.FC<{ color?: string }>
const FaUsers = RawFaUsers as React.FC<{ color?: string }>
const FaCogs = RawFaCogs as React.FC<{ color?: string }>
const FaFolderOpen = RawFaFolderOpen as React.FC<{ color?: string }>
const FaRegEye = RawFaRegEye as React.FC<{ color?: string }>

export default function IntroductionPage() {
  return (
    <div className="card" style={{ maxWidth: 900, margin: '40px auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32, color: '#003cff' }}>
        프로젝트 소개
      </h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaRegEye color="#3498db" /> 서비스 개요
        </h2>
        <ul>
          <li>전자계약의 보안성과 실시간성을 갖춘 플랫폼</li>
          <li>
            회원 인증, OTP, X.509 인증서, 전자서명, 해시체인 로그, 실시간 알림,
            미리보기/다운로드/서명 등 전자계약에 필요한 기능 제공
          </li>
          <li>민감 정보(이메일, 계약서, 키 등)는 AES 등으로 암호화 저장</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaUserShield color="#3498db" /> 회원가입/로그인/OTP/인증서
        </h2>
        <ul>
          <li>
            이메일/아이디/비밀번호/OTP로 회원가입, Google OTP 기반 2차 인증 필수
          </li>
          <li>회원가입 시 공개키/개인키 쌍 자동 생성, X.509 인증서 발급</li>
          <li>개인키는 브라우저(IndexedDB)에 암호화 저장, 서버는 알 수 없음</li>
          <li>
            OTP 인증 성공 시에만 사용자 DB(User)에 등록, 실패 시 TempUser에서
            자동 삭제(TTL 5분)
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaFileSignature color="#3498db" /> 계약서 상태별
          미리보기/다운로드/삭제 정책
        </h2>
        <ul>
          <li>
            <b>정상(uploaded)</b>: 송신자/수신자 모두 미리보기 가능, 다운로드는
            송신자만 가능(수신자는 인증/서명 전에는 불가)
          </li>
          <li>
            <b>서명완료(signed)</b>: 송신자/수신자 모두 미리보기/다운로드 가능
          </li>
          <li>
            <b>거부(rejected)</b>: 송신자는 미리보기/다운로드 가능, 수신자는
            모두 불가
          </li>
          <li>
            <b>만료(expired)</b>: 송신자/수신자 모두 미리보기/다운로드 불가
          </li>
          <li>
            <b>삭제(soft delete)</b>: 삭제한 측만 리스트/상세/미리보기/다운로드
            모두 숨김, 상대방은 계속 볼 수 있음. 양쪽 모두 삭제 시 완전
            삭제(DB에서 제거)
          </li>
          <li>모든 상태 변화는 DB와 프론트에 즉시 반영</li>
        </ul>
        <ul>
          <li>미리보기는 PDF(1페이지), DOCX/TXT(1000자)만 지원</li>
          <li>서명 플로우: QR 인증 → 전자서명 → 손글씨 입력</li>
          <li>
            만료일이 지난 계약은 접근 시 DB와 프론트 모두 expired로 즉시 반영
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaBell color="#3498db" /> 실시간 알림/로그
        </h2>
        <ul>
          <li>10~30초 폴링, 종/메시지 아이콘, 읽지 않은 알림 개수 표시</li>
          <li>
            수신자 이메일 검증(DB 등록 여부), 무결성 체크, QR 인증 코드로 서명
            전 인증
          </li>
          <li>
            전자서명 및 손글씨 서명(클라이언트에서 생성, 서버에는 서명값만 전송)
          </li>
          <li>계약 기간 등 유효성 체크</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaBell color="#3498db" /> 알림/로그/네비게이션
        </h2>
        <ul>
          <li>실시간 알림(회원가입/로그인/계약 송수신 등)</li>
          <li>모든 행위(열람, 서명, 검증 등)는 해시체인 기반 로그로 저장</li>
          <li>
            네비게이션 바에 사용자 정보(프로필, 아이디 변경), 로그아웃/탈퇴,
            프로젝트 소개 페이지
          </li>
          <li>
            계약서 파일: 업로드 시 AES-256으로 암호화, 키는 RSA로 이중 암호화
          </li>
          <li>JWT: email은 평문(복호화된 값)으로 발급, 인증/인가에 사용</li>
          <li>회원탈퇴: 개인키/토큰/IndexedDB 완전 삭제</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaLock color="#3498db" /> 보안 구조 및 서비스 구성
        </h2>
        <ul>
          <li>
            CA(인증기관) 개인키는 환경변수로만 접근, 서버 API에서만 서명 처리
          </li>
          <li>
            인증서 상태(유효/만료/폐기)는 서버에서만 변경 가능, 클라이언트는
            조회만 가능
          </li>
          <li>
            모든 민감 정보(이메일, 계약서, 키 등)는 AES 등으로 암호화 저장
          </li>
          <li>
            계약서 파일: 업로드 시 AES-256으로 암호화, 키는 RSA로 이중 암호화
          </li>
          <li>JWT: email은 평문(복호화된 값)으로 발급, 인증/인가에 사용</li>
          <li>회원탈퇴: 개인키/토큰/IndexedDB 완전 삭제</li>
          <li>
            환경변수: 모든 키/시크릿은 .env로 관리, 프론트 접근 필요한 값은
            NEXT_PUBLIC_ 접두사 사용
          </li>
        </ul>
        <div style={{ marginTop: 12 }}>
          <b>폴더 구조</b>
          <ul>
            <li>
              /app : Next.js API 라우트, 페이지(홈, 소개, 로그인, 회원가입,
              계약함 등)
            </li>
            <li>
              /components : UI 컴포넌트 (ContractPreviewModal, NotificationList
              등)
            </li>
            <li>
              /models : Mongoose 모델 (User, Contract, Log, Notification 등)
            </li>
            <li>/utils : 암호화, IndexedDB, 다운로드 등 유틸 함수</li>
            <li>/constants : 계약 상태 등 상수</li>
            <li>/public : 정적 파일</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaCogs color="#3498db" /> 기술 스택
        </h2>
        <ul>
          <li>Frontend: Next.js, React, TypeScript, IndexedDB, WebCrypto</li>
          <li>Backend: Node.js, MongoDB, Mongoose, JWT</li>
          <li>보안: AES-GCM, PBKDF2, RSA, X.509, SHA-256, Google OTP</li>
          <li>
            배포: Vercel(Serverless), .env 환경변수, Vercel Cron(만료 스케줄러)
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaUsers color="#3498db" /> 문의/팀
        </h2>
        <ul>
          <li>팀원 소개, 문의/피드백, 깃허브 등 링크 제공 (필요시 추가)</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaCogs color="#3498db" /> 서비스 이용 예시 흐름
        </h2>
        <ol style={{ marginLeft: 18 }}>
          <li>회원가입 (이메일, 아이디, 비밀번호) → OTP 발급</li>
          <li>OTP 인증 성공 → 공개키/개인키 + 인증서 생성 → DB 등록</li>
          <li>로그인 → OTP 입력 → 성공 → contract/page 이동</li>
          <li>계약서 업로드 → 암호화 및 전송 → 수신자 알림 → 수신 확인</li>
          <li>수신자 무결성 검증 → QR 본인 인증 → 전자서명 및 손글씨 서명</li>
          <li>모든 활동은 로그 및 알림으로 기록, 즉시 DB에 저장</li>
          <li>
            수신함/송신함: 미리보기(모두), 다운로드(송신자만/수신자는 인증 후),
            삭제(soft delete)
          </li>
          <li>
            서명 확인은 실시간 반영, 수신 취소/삭제/탈퇴 시 rejected, 만료 시
            expired, 업로드만 했을 시 uploaded
          </li>
          <li>모든 상태 변화는 DB와 프론트에 즉시 반영</li>
        </ol>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaLock color="#3498db" /> 인증/보안 정책 보강
        </h2>
        <ul>
          <li>Refresh Token은 httpOnly 쿠키로 저장, jti로 재사용 방지</li>
          <li>/api/auth/refresh에서 갱신, jti 일치 여부로 보안 강화</li>
          <li>authFetch 등에서 자동 갱신 처리</li>
          <li>
            쿠키 SameSite=Strict: 타 사이트에서의 요청(즉, CSRF 공격)에는 쿠키가
            자동으로 전송되지 않으므로, CSRF 방지 효과
          </li>
          <li>HttpOnly: 자바스크립트로 쿠키 접근 불가(클라이언트 XSS 방지)</li>
          <li>Secure: HTTPS에서만 쿠키 전송</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaCogs color="#3498db" /> 해시체인 로그 구조 예시
        </h2>
        <ul>
          <li>
            contractId: A<br />
            업로드 → previousHash: ""
            <br />
            다운로드 → previousHash: (업로드의 hash)
            <br />
            미리보기 → previousHash: (다운로드의 hash)
          </li>
          <li>
            contractId: B<br />
            업로드 → previousHash: ""
            <br />
            다운로드 → previousHash: (업로드의 hash)
          </li>
          <li>
            contractId가 다르면 체인이 이어지지 않음. contractId가 같고, 활동이
            연속되면 previousHash가 계속 이어짐.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaCogs color="#3498db" /> 환경변수 자동 생성
        </h2>
        <ul>
          <li>
            scripts/genSecrets.js로 .env에 필요한 보안 키/시크릿을 안전하게 자동
            생성 가능
          </li>
          <li>
            예: LOCAL_KEY, LOCAL_SALT, JWT_SECRET, REFRESH_JWT_SECRET, AES_KEY
            등
          </li>
        </ul>
      </section>
    </div>
  )
}
