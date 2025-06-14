import React from 'react'
import {
  FaUserShield,
  FaFileSignature,
  FaBell,
  FaLock,
  FaUsers,
  FaCogs,
  FaRegEye,
} from 'react-icons/fa'

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
          <li>전자계약 보안성과 실시간성 플랫폼</li>
          <li>
            회원 인증, OTP, X.509 인증서, 전자서명, 해시체인 로그, 실시간 알림,
            미리보기/다운로드/서명 기능 제공
          </li>
          <li>
            민감 정보(AES 암호화), 개인키는 브라우저 IndexedDB에 암호화 저장
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaUserShield color="#3498db" /> 회원가입/로그인/OTP/인증서
        </h2>
        <ul>
          <li>이메일/아이디/비밀번호/Google OTP 기반 2차 인증 필수</li>
          <li>회원가입 시 공개키/개인키 쌍 생성 및 X.509 인증서 발급</li>
          <li>OTP 성공 시 DB 등록, 실패 시 임시 데이터 5분 후 자동 삭제</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaFileSignature color="#3498db" /> 계약서 상태별 권한 정책
        </h2>
        <ul>
          <li>
            정상(uploaded): 송신자/수신자 미리보기 가능, 다운로드는 송신자만
          </li>
          <li>서명완료(signed): 양측 모두 미리보기/다운로드 가능</li>
          <li>거부(rejected): 송신자만 미리보기/다운로드 가능</li>
          <li>만료(expired): 양측 모두 미리보기/다운로드 불가</li>
          <li>
            삭제(soft delete): 삭제한 측만 숨김, 양측 모두 삭제 시 DB 완전 제거
          </li>
          <li>미리보기: PDF 1페이지, DOCX/TXT 1000자 지원</li>
          <li>서명 플로우: QR 인증 → 전자서명 → 손글씨 입력</li>
          <li>상태 변화는 DB와 프론트에 즉시 반영</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaBell color="#3498db" /> 실시간 알림 및 로그
        </h2>
        <ul>
          <li>10~30초 폴링, 읽지 않은 알림 개수 표시</li>
          <li>수신자 이메일 검증, 무결성 체크, QR 인증 코드 기반 서명 인증</li>
          <li>클라이언트 생성 전자서명 및 손글씨 서명값 서버 전송</li>
          <li>모든 행위는 해시체인 기반 로그로 기록</li>
          <li>네비게이션 바에 사용자 정보 및 프로젝트 소개 페이지 포함</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaLock color="#3498db" /> 보안 구조 및 정책
        </h2>
        <ul>
          <li>CA 개인키는 환경변수로만 접근, 서버 API에서 서명 처리</li>
          <li>인증서 상태 변경은 서버 전용, 클라이언트는 조회만 가능</li>
          <li>계약서 파일 AES-256 암호화, 키는 RSA로 이중 암호화</li>
          <li>JWT는 email 평문 발급, 인증/인가용</li>
          <li>회원탈퇴 시 개인키, 토큰, IndexedDB 완전 삭제</li>
          <li>Refresh Token은 httpOnly 쿠키, jti로 재사용 방지</li>
          <li>쿠키는 SameSite=Strict, HttpOnly, Secure 속성 적용</li>
          <li>환경변수는 .env 관리, NEXT_PUBLIC_ 접두사로 프론트 접근</li>
        </ul>
        <div style={{ marginTop: 12 }}>
          <b>폴더 구조</b>
          <ul>
            <li>/app: API 및 페이지</li>
            <li>/components: UI 컴포넌트</li>
            <li>/models: Mongoose 모델</li>
            <li>/utils: 암호화, IndexedDB 등 유틸</li>
            <li>/constants: 상수 정의</li>
            <li>/public: 정적 파일</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaCogs color="#3498db" /> 기술 스택 및 흐름
        </h2>
        <ul>
          <li>Frontend: Next.js, React, TypeScript, IndexedDB, WebCrypto</li>
          <li>Backend: Node.js, MongoDB, Mongoose, JWT</li>
          <li>보안: AES-GCM, PBKDF2, RSA, X.509, SHA-256, Google OTP</li>
          <li>배포: Vercel(Serverless), .env, Vercel Cron</li>
        </ul>
        <ol style={{ marginLeft: 18 }}>
          <li>회원가입 → OTP 발급 → 공개키/개인키 및 인증서 생성 → DB 등록</li>
          <li>로그인 → OTP 인증 → 계약 페이지 이동</li>
          <li>계약서 업로드 → 암호화 → 수신자 알림 및 확인</li>
          <li>수신자 무결성 검증 → QR 인증 → 전자서명 및 손글씨 서명</li>
          <li>활동 로그 및 알림 DB 저장, 실시간 상태 반영</li>
          <li>송/수신함: 미리보기, 다운로드(송신자만), 삭제(soft delete)</li>
        </ol>
      </section>
    </div>
  )
}
