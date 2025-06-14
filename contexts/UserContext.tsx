'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface User {
  userId?: string
  username: string
  certificateStatus: string
  email: string
}

interface UserContextType {
  user: User | null
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/user/me')
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setUser(data)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUserContext must be used within a UserProvider')
  return ctx
}
