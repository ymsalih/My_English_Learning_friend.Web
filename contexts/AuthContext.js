'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw { code: 'auth/unverified-email', message: 'Lütfen giriş yapmadan önce e-posta adresinizi doğrulayın.' };
    }
    return userCredential;
  };

  const register = async (email, password, username) => {
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
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, userData, isPro, login, register, logout, resetPassword, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
