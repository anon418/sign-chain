// 인증서 발급
const forge = require('node-forge')
const fs = require('fs')
const { pki } = forge

const keys = pki.rsa.generateKeyPair(2048)
const cert = pki.createCertificate()
cert.publicKey = keys.publicKey
cert.serialNumber = '01'
cert.validity.notBefore = new Date()
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10)

const attrs = [
  { name: 'commonName', value: 'MyCA' },
  { name: 'emailAddress', value: 'ca@example.com' },
]
cert.setSubject(attrs)
cert.setIssuer(attrs)

cert.setExtensions([
  { name: 'basicConstraints', cA: true },
  { name: 'keyUsage', keyCertSign: true },
  { name: 'subjectKeyIdentifier' },
])

cert.sign(keys.privateKey, forge.md.sha256.create())

fs.writeFileSync('rootCert.pem', pki.certificateToPem(cert))
fs.writeFileSync('rootPrivateKey.pem', pki.privateKeyToPem(keys.privateKey))
console.log('CA 인증서 및 개인키 생성 완료')

module.exports = {
  caPrivateKey: keys.privateKey,
  caCertificate: cert,
}
