import { useCallback, useState } from 'react';
import { api } from '../../api/apiClient';

type LibrarySavePayload = {
  title: string;
  content: string;
  category: string;
  originalInput: string;
  scriptType: string;
};

export function useLibraryFeature({
  currentUser,
  onProfileRefresh,
}: {
  currentUser: unknown;
  onProfileRefresh?: () => void;
}) {
  const [savedScripts, setSavedScripts] = useState<any[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [saveToLibrarySuccess, setSaveToLibrarySuccess] = useState(false);

  const fetchSavedScripts = useCallback(async () => {
    if (!currentUser) return;
    setScriptsLoading(true);
    try {
      setSavedScripts(await api.get<any[]>('/api/news-scripts'));
    } catch (error) {
      console.error('Failed to fetch saved scripts', error);
    } finally {
      setScriptsLoading(false);
    }
  }, [currentUser]);

  const saveToLibrary = useCallback(async (payload: LibrarySavePayload) => {
    if (!currentUser) return;
    setIsSavingToLibrary(true);
    try {
      await api.post('/api/news-scripts', payload);
      setSaveToLibrarySuccess(true);
      onProfileRefresh?.();
      window.setTimeout(() => setSaveToLibrarySuccess(false), 3000);
    } finally {
      setIsSavingToLibrary(false);
    }
  }, [currentUser, onProfileRefresh]);

  const deleteSavedScript = useCallback(async (id: number) => {
    if (!currentUser) return;
    if (!window.confirm('ဤသတင်းဆောင်းပါးကိုမှ လုံးဝပယ်ဖျက်ရန် အတည်ပြုပါသလား?')) return;
    try {
      await api.delete(`/api/news-scripts/${id}`);
      await fetchSavedScripts();
      onProfileRefresh?.();
    } catch (error) {
      console.error(error);
      alert('မအောင်မြင်ပါ။');
    }
  }, [currentUser, fetchSavedScripts, onProfileRefresh]);

  return {
    savedScripts,
    scriptsLoading,
    isSavingToLibrary,
    saveToLibrarySuccess,
    fetchSavedScripts,
    saveToLibrary,
    deleteSavedScript,
  };
}
