// lib/validateCertificate.ts
import Contract from '../models/Contract';
import forge from 'node-forge';
import * as fs from 'fs';

export async function validateCertificate(
  contractId: string,
  certificatePem: string
): Promise<boolean> {
  try {
    const contract = await Contract.findById(contractId);

    if (!contract) {
      console.error('계약서를 찾을 수 없습니다.');
      return false;
    }

    const expirationDate = new Date(contract.expirationDate);
    const now = new Date();

    if (expirationDate < now) {
      console.error('계약서가 만료되었습니다.');
      return false;
    }

    // 계약 상태 확인
    const validStatuses = ['uploaded', 'pending_signature', 'signed'];
    if (!validStatuses.includes(contract.status)) {
      console.error('계약 상태가 유효하지 않습니다.');
      return false;
    }

    // 인증서 유효성 검사
    try {
      const certificate = forge.pki.certificateFromPem(certificatePem);

      // CA 인증서 로드
      const caCertPem = fs.readFileSync('rootCert.pem', 'utf8');
      const caCert = forge.pki.certificateFromPem(caCertPem);

      // 인증서 검증
      const verified = caCert.verify(certificate);
      if (!verified) {
        console.error('인증서 검증 실패: CA가 서명하지 않음');
        return false;
      }

      // 만료일 확인
      const notAfter = certificate.validity.notAfter;
      if (notAfter < now) {
        console.error('인증서가 만료되었습니다.');
        return false;
      }
    } catch (error) {
      console.error('인증서 파싱 또는 검증 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('인증서 유효성 검사 오류:', error);
    return false;
  }
}
