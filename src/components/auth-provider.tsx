'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This is the special email for the first super admin user.
const SUPER_ADMIN_EMAIL = 'pedrodearaujo.192@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        
        const unsubSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            // If the user document exists, set the user data.
            setUserData({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            setLoading(false);
          } else {
            // If the document doesn't exist, we might need to create it.
            // Check if it's the designated super admin logging in for the first time.
            if (user.email === SUPER_ADMIN_EMAIL) {
              try {
                // Create the super admin document in Firestore.
                await setDoc(userDocRef, {
                  nome: user.displayName || 'Super Admin',
                  email: user.email,
                  tipo: 'super_adm',
                  ativo: true,
                  criadoEm: serverTimestamp(),
                });
                // The onSnapshot listener will be triggered again by this setDoc,
                // and the "if (docSnap.exists())" block will execute, setting the userData.
                // We don't need to do anything else here.
              } catch (error) {
                console.error("Failed to create super admin profile:", error);
                // If creation fails, proceed as a user with no data.
                setUserData(null);
                setLoading(false);
              }
            } else {
              // For any other user without a profile, they have no data.
              setUserData(null);
              setLoading(false);
            }
          }
        });
        
        return () => unsubSnapshot();
      } else {
        // No user is logged in.
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = { user, userData, loading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
