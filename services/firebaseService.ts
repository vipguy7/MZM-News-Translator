import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Firestore Error Information Interfaces (As required by Firebase Integration Skill)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile Data Structure
export interface UserProfile {
  uid: string;
  email: string;
  credits: number;
  customApiKey?: string;
  customOpenAiKey?: string;
  lastDailyReset: string; // Format: YYYY-MM-DD
}


// Format date to local YYYY-MM-DD
export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Ensure Connection is Valid (Required Connection validation)
async function validateFirebaseConnection() {
  try {
    await getDocFromServer(doc(db, 'users', 'connection_probe'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is offline. Please check network configuration.");
    }
  }
}
validateFirebaseConnection();

// Fetch or create a user profile in Firestore
export async function getOrCreateUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const today = getLocalDateString();
  
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let credits = data.credits ?? 30;
      let lastDailyReset = data.lastDailyReset ?? today;
      
      // Perform daily credit reset check (30 credits a day)
      if (lastDailyReset !== today) {
        credits = 30;
        lastDailyReset = today;
        try {
          await updateDoc(userRef, { credits, lastDailyReset });
        } catch (e) {
          console.warn("Failed to update doc:", e);
        }
      }
      
      return {
        uid: user.uid,
        email: user.email || '',
        credits,
        customApiKey: data.customApiKey || '',
        customOpenAiKey: data.customOpenAiKey || '',
        lastDailyReset
      };
    } else {
      // Create a brand new user profile
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        credits: 30,
        customApiKey: '',
        customOpenAiKey: '',
        lastDailyReset: today
      };
      
      try {
        await setDoc(userRef, {
          email: newProfile.email,
          credits: newProfile.credits,
          customApiKey: newProfile.customApiKey,
          customOpenAiKey: newProfile.customOpenAiKey,
          lastDailyReset: newProfile.lastDailyReset
        });
      } catch (e) {
        console.warn("Failed to set doc:", e);
      }
      
      return newProfile;
    }
  } catch (error) {
    console.warn("Firestore error getting profile, using local fallback profile:", error);
    return {
      uid: user.uid,
      email: user.email || '',
      credits: 30,
      customApiKey: '',
      customOpenAiKey: '',
      lastDailyReset: today
    };
  }
}

// Update Custom API Key
export async function updateUserApiKey(uid: string, customApiKey: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, { customApiKey });
  } catch (error) {
    console.warn("Failed to update user API key in Firestore:", error);
  }
}

// Update Custom OpenAI API Key
export async function updateUserOpenAiKey(uid: string, customOpenAiKey: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, { customOpenAiKey });
  } catch (error) {
    console.warn("Failed to update user OpenAI API key in Firestore:", error);
  }
}

// Consume 1 credit
export async function consumeSystemCredit(uid: string, currentCredits: number): Promise<number> {
  if (currentCredits <= 0) {
    throw new Error('Your system credits of 30 limit have been exhausted. Please enter your personal custom Gemini API Key inside Settings or try again tomorrow.');
  }
  const userRef = doc(db, 'users', uid);
  const newCredits = currentCredits - 1;
  try {
    await updateDoc(userRef, { credits: newCredits });
  } catch (error) {
    console.warn("Failed to update credits in Firestore:", error);
  }
  return newCredits;
}
