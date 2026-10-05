import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from './firebase'
import { api } from './api'

const AuthContext = createContext(null)

// Last known profile per user, so the installed app still opens (and the
// offline inspection queue stays reachable) when started without network.
const PROFILE_CACHE_KEY = 'locavision.profile'

function readCachedProfile(uid) {
  try {
    const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || 'null')
    return cached?.uid === uid ? cached : null
  } catch {
    return null
  }
}

function writeCachedProfile(profile) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
    else localStorage.removeItem(PROFILE_CACHE_KEY)
  } catch {
    // storage unavailable (private mode): the cache is a convenience only
  }
}

function loginErrorMessage(e) {
  switch (e?.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Identifiants incorrects. Vérifiez votre identifiant et votre mot de passe.'
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé. Contactez votre administrateur.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
    case 'auth/network-request-failed':
      return 'Pas de connexion internet. Vérifiez votre réseau.'
    default:
      return 'Connexion impossible. Réessayez dans un instant.'
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) // { role, companyId, companyName, uid, enabledModules, ... }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true)
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const me = await api.me()
          setProfile(me)
          setError(null)
          writeCachedProfile(me)
        } catch (e) {
          const cached = e.isRetryable ? readCachedProfile(firebaseUser.uid) : null
          if (cached) {
            setProfile(cached) // offline / server hiccup: keep working with the last known profile
          } else {
            // Account disabled, company suspended/expired, etc.: sign out so
            // the login screen shows why instead of a half-logged-in state.
            setProfile(null)
            setError(e.message)
            writeCachedProfile(null)
            if (!e.isRetryable) await signOut(auth).catch(() => {})
          }
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (email, password) => {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (e) {
      setError(loginErrorMessage(e))
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    writeCachedProfile(null)
    await signOut(auth)
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
