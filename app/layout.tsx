import type { Metadata } from 'next'
import './globals.css'
import { NotificationProvider } from '../contexts/NotificationContext'
import { ContractProvider } from '../contexts/ContractContext'
import GlobalLoading from '../components/GlobalLoading'
import { UserProvider } from '../contexts/UserContext'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SignChain',
  description: '전자서명/계약 서비스',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <UserProvider>
          <NotificationProvider>
            <ContractProvider>
              <GlobalLoading />
              {children}
            </ContractProvider>
          </NotificationProvider>
        </UserProvider>
      </body>
    </html>
  )
}
