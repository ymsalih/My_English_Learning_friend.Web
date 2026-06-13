'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // If user is logged in but hasn't verified email, sign them out
      if (user && !user.emailVerified) {
        await signOut(auth);
        setUser(null);
        setUserData(null);
        setIsPro(false);
        setLoading(false);
        return;
      }

      setUser(user);
      
      if (user && user.emailVerified) {
        unsubscribeSnapshot = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            
            let proStatus = false;
            if (data.plan === 'pro_monthly' || data.plan === 'pro_yearly' || data.plan === 'pro') {
              if (data.expiryDate) {
                const expiry = new Date(data.expiryDate);
                if (expiry > new Date()) {
                  proStatus = true;
                }
              } else {
                // Sınırsız / Test kullanıcıları için
                proStatus = data.plan === 'pro';
              }
            }
            setIsPro(proStatus);
          }
        });
      } else {
        setUserData(null);
        setIsPro(false);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Separate effect for redirect logic to prevent auth listener remounting
  useEffect(() => {
    if (loading) return; // Wait for initial auth state to resolve
    
    const publicPaths = ['/login', '/register', '/forgot-password', '/'];
    if (!user && !publicPaths.includes(pathname)) {
      router.push('/login');
    } else if (user && user.emailVerified && publicPaths.includes(pathname)) {
      router.push('/dashboard');
    }
  }, [user, pathname, router, loading]);

  const login = useCallback(async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw { code: 'auth/unverified-email', message: 'Lütfen giriş yapmadan önce e-posta adresinizi doğrulayın.' };
    }
    return userCredential;
  }, []);

  const register = useCallback(async (email, password, username) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
      
      // Create user document in Firestore with default 'free' plan and counters
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: username,
        email: email,
        plan: 'free',
        totalWordsAdded: 0,
        dailyOcrCount: 0,
        lastOcrDate: null,
        dailyTestCount: 0,
        lastTestDate: null,
        dailyAiMessageCount: 0,
        lastAiDate: null,
        dailyStoryCount: 0,
        lastStoryDate: null,
        dailyShadowingCount: 0,
        lastShadowingDate: null,
        createdAt: serverTimestamp(),
      });

      // Instantly sign out so they don't get auto-logged in
      await signOut(auth);
    }
    
    return userCredential;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    router.push('/login');
  }, [router]);

  const resetPassword = useCallback(async (email) => {
    return sendPasswordResetEmail(auth, email);
  }, []);

  const contextValue = useMemo(() => ({
    user,
    userData,
    isPro,
    loading,
    login,
    register,
    logout,
    resetPassword
  }), [user, userData, isPro, loading, login, register, logout, resetPassword]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--background)',
        gap: '1.5rem'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'var(--primary-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: '900',
          color: 'white',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          O
        </div>
        
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: '800',
          background: 'var(--primary-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 -0.5rem 0',
          letterSpacing: '-0.5px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          Owlish
        </h1>

        <div style={{
          width: '120px',
          height: '4px',
          borderRadius: '4px',
          background: 'var(--glass-border)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            height: '100%',
            width: '40%',
            borderRadius: '4px',
            background: 'var(--primary-gradient)',
            animation: 'loadingBar 1s ease-in-out infinite'
          }} />
        </div>
        <style>{`
          @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
          @keyframes loadingBar { 0% { left: -40%; } 100% { left: 100%; } }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
