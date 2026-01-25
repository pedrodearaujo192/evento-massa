'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, where, Timestamp } from 'firebase/firestore';
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
      if (user && user.email) {
        // We will listen to changes based on the user's email, 
        // as the document ID for 'adm_evento' might not match the auth UID.
        const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
        
        const unsubSnapshot = onSnapshot(q, async (querySnapshot) => {
          if (!querySnapshot.empty) {
            // If a user document is found with the email, use it.
            const userDoc = querySnapshot.docs[0];
            setUserData({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
            setLoading(false);
          } else {
            // If no document is found by email, check if it's the super admin's first login.
            // This is a special case to bootstrap the first user.
            if (user.email === SUPER_ADMIN_EMAIL) {
              const userDocRef = doc(db, 'usuarios', user.uid);
              try {
                // Create the super admin document in Firestore with the UID as the document ID.
                await setDoc(userDocRef, {
                  nome: user.displayName || 'Super Admin',
                  email: user.email,
                  tipo: 'super_adm',
                  ativo: true,
                  criadoEm: serverTimestamp(),
                });
                // After creation, the onSnapshot listener for the query will fire,
                // but we can also set it directly to speed up the first login.
                const newProfile: UserProfile = {
                    uid: user.uid,
                    nome: user.displayName || 'Super Admin',
                    email: user.email!,
                    tipo: 'super_adm',
                    ativo: true,
                    criadoEm: serverTimestamp() as Timestamp,
                };
                setUserData(newProfile);
                setLoading(false);
              } catch (error) {
                console.error("Failed to create super admin profile:", error);
                setUserData(null);
                setLoading(false);
              }
            } else {
              // For any other authenticated user without a profile document, they have no data.
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
