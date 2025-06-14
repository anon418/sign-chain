import React from 'react'
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa'

interface ContractUploadFormProps {
  file: File | null
  recipientEmail: string
  emailStatus: 'idle' | 'checking' | 'valid' | 'invalid'
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
  uploadMsg: string
  handleUpload: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRecipientEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  emailMsg: string
  user: { username: string; certificateStatus: string; email: string } | null
}

export default function ContractUploadForm({
  file,
  recipientEmail,
  emailStatus,
  uploadStatus,
  uploadMsg,
  handleUpload,
  handleFileChange,
  handleRecipientEmailChange,
  emailMsg,
  user,
}: ContractUploadFormProps) {
  return (
    <form
      onSubmit={handleUpload}
      style={{
        marginBottom: 32,
        background: '#f4f8ff',
        padding: 20,
        borderRadius: 10,
        boxShadow: '0 2px 8px #0001',
        position: 'relative',
        overflow: 'hidden',
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (
          e.key === 'Enter' &&
          file &&
          recipientEmail &&
          emailStatus === 'valid' &&
          uploadStatus !== 'uploading'
        ) {
          handleUpload(e)
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="file"
          name="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          style={{
            flex: 1,
            cursor: 'pointer',
            boxShadow: undefined,
            transition: 'box-shadow 0.18s',
          }}
          required
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow =
              '0 4px 16px rgba(25, 118, 210, 0.18)')
          }
          onMouseOut={(e) => (e.currentTarget.style.boxShadow = '')}
        />
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
          PDF, DOCX, TXT 파일만 업로드할 수 있습니다.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 8 }}>
          <input
            type="email"
            placeholder="수신자 이메일"
            value={recipientEmail}
            onChange={handleRecipientEmailChange}
            style={{
              flex: 1,
              borderColor:
                emailStatus === 'invalid' ||
                (user && recipientEmail === user.email)
                  ? 'red'
                  : undefined,
            }}
            required
          />
          {recipientEmail && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {emailStatus === 'valid' && (
                <>
                  <FaCheckCircle color="green" style={{ fontSize: 16 }} />
                  <span style={{ color: 'green', fontSize: 13, marginLeft: 2 }}>
                    등록된 이메일입니다.
                  </span>
                </>
              )}
              {emailStatus === 'invalid' &&
                emailMsg === '본인 이메일로는 보낼 수 없습니다.' && (
                  <>
                    <FaTimesCircle color="red" style={{ fontSize: 16 }} />
                    <span style={{ color: 'red', fontSize: 13, marginLeft: 2 }}>
                      본인 이메일로는 보낼 수 없습니다.
                    </span>
                  </>
                )}
              {emailStatus === 'invalid' &&
                emailMsg !== '본인 이메일로는 보낼 수 없습니다.' && (
                  <>
                    <FaTimesCircle color="red" style={{ fontSize: 16 }} />
                    <span style={{ color: 'red', fontSize: 13, marginLeft: 2 }}>
                      {emailMsg}
                    </span>
                  </>
                )}
              {emailStatus === 'checking' && (
                <FaSpinner
                  className="spin"
                  color="#888"
                  style={{ fontSize: 16 }}
                />
              )}
            </span>
          )}
        </div>
        <button
          type="submit"
          className="clickable"
          disabled={uploadStatus === 'uploading' || emailStatus !== 'valid'}
          style={{
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 18px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background 0.18s, box-shadow 0.18s',
            boxShadow: undefined,
            cursor: 'pointer',
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow =
              '0 4px 16px rgba(25, 118, 210, 0.18)')
          }
          onMouseOut={(e) => (e.currentTarget.style.boxShadow = '')}
        >
          {uploadStatus === 'uploading' ? (
            <>
              <FaSpinner className="spin" style={{ fontSize: 16 }} /> 업로드
              중...
            </>
          ) : (
            '계약서 업로드'
          )}
        </button>
      </div>
      {uploadMsg && (
        <div
          style={{
            color: uploadStatus === 'success' ? 'green' : 'red',
            marginTop: 8,
            fontWeight: 600,
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {uploadStatus === 'success' ? (
            <FaCheckCircle color="green" />
          ) : (
            <FaTimesCircle color="red" />
          )}{' '}
          {uploadMsg}
        </div>
      )}
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </form>
  )
}
