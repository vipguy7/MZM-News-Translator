import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';
import {
  auth,
  getOrCreateUserProfile,
  logoutGoogle,
  updateUserApiKey,
  updateUserOpenAiKey,
  UserProfile,
  googleSignIn,
} from '../../../../services/firebaseService';
import {
  setCustomApiKeyForGemini,
  setCustomApiKeyForOpenAi,
  setPreferredModel,
} from '../../../../services/geminiService';

type PreferredModel = 'gemini' | 'gemini-pro' | 'gemini-2.5-flash' | 'openai';

type AuthError = {
  code?: string;
  message?: string;
};

function mapAuthError(error: AuthError, isGoogle = false): string {
  if (isGoogle) {
    if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user')) {
      return 'အကောင့်ဝင်ရန် ဖွင့်လှစ်ထားသော Window ကို ပိတ်လိုက်သဖြင့် အကောင့်ဝင်ခြင်းမအောင်မြင်ပါ။ ပြန်လည်ကြိုးစားပါ။';
    }
    if (error.code === 'auth/popup-blocked') {
      return 'Popup blocker ကြောင့် window မပွင့်ပါ။ Browser settings တွင် Popups ခွင့်ပြုပေးပါရန်။';
    }
    return error.message || 'Google OpenID Sign-in failed.';
  }

  if (error.code === 'auth/weak-password') {
    return 'စကားဝှက်သည် အနည်းဆုံး စာလုံး ၆ လုံး ရှိရမည်';
  }
  if (error.code === 'auth/email-already-in-use') {
    return 'ဤအီးမေးလ်ဖြင့် အကောင့်ဖွင့်ထားပြီး ဖြစ်သည်။';
  }
  if (error.code === 'auth/invalid-credential') {
    return 'အီးမေးလ် သို့မဟုတ် စကားဝှက် လွဲမှားနေသည်';
  }
  return error.message || 'အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ။ ပြန်လည်ကြိုးစားပါ။';
}

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempOpenAiKey, setTempOpenAiKey] = useState('');
  const [preferredModel, setPreferredModelLocal] = useState<PreferredModel>('gemini');

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setTempApiKey('');
        setTempOpenAiKey('');
        setCustomApiKeyForGemini(undefined);
        setCustomApiKeyForOpenAi(undefined);
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await getOrCreateUserProfile(user);
        setUserProfile(profile);
        setTempApiKey(profile.customApiKey || '');
        setTempOpenAiKey(profile.customOpenAiKey || '');
        setCustomApiKeyForGemini(profile.customApiKey?.trim() || undefined);
        setCustomApiKeyForOpenAi(profile.customOpenAiKey?.trim() || undefined);
      } catch (error) {
        console.error('Error creating user profile:', error);
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    setPreferredModel(preferredModel);
  }, [preferredModel]);

  const signInWithEmail = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError('အီးမေးလ်နှင့် စကားဝှက်ကို ဖြည့်စွက်ပါ။');
      return;
    }

    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (error) {
      console.error(error);
      setAuthError(mapAuthError(error as AuthError));
    }
  }, [authEmail, authPassword, isSignUpMode]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await googleSignIn();
    } catch (error) {
      console.error(error);
      setAuthError(mapAuthError(error as AuthError, true));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await logoutGoogle();
    } catch (error) {
      console.error('Signout error:', error);
    }
  }, []);

  const saveApiKeys = useCallback(async () => {
    if (!currentUser) return;

    try {
      await updateUserApiKey(currentUser.uid, tempApiKey);
      await updateUserOpenAiKey(currentUser.uid, tempOpenAiKey);
      setUserProfile((previous) => previous ? {
        ...previous,
        customApiKey: tempApiKey,
        customOpenAiKey: tempOpenAiKey,
      } : previous);
      setCustomApiKeyForGemini(tempApiKey.trim() || undefined);
      setCustomApiKeyForOpenAi(tempOpenAiKey.trim() || undefined);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }, [currentUser, tempApiKey, tempOpenAiKey]);

  return {
    currentUser,
    userProfile,
    setUserProfile,
    authLoading,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    isSignUpMode,
    setIsSignUpMode,
    authError,
    tempApiKey,
    setTempApiKey,
    tempOpenAiKey,
    setTempOpenAiKey,
    preferredModel,
    setPreferredModelLocal,
    signInWithEmail,
    signInWithGoogle,
    signOutUser,
    saveApiKeys,
  };
}
