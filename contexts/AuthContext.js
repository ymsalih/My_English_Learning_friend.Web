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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Redirect logic
      if (!user && pathname !== '/login' && pathname !== '/') {
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/')) {
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password, username) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
      
      // Create user document in Firestore with default 'free' plan
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: username,
        email: email,
        plan: 'free',
        createdAt: serverTimestamp(),
      });
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
    <AuthContext.Provider value={{ user, login, register, logout, resetPassword, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
