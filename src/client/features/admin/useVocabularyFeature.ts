import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/apiClient';

export function useVocabularyFeature({ currentUser }: { currentUser: unknown }) {
  const [globalVocabularyList, setGlobalVocabularyList] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [newGlobalEnglish, setNewGlobalEnglish] = useState('');
  const [newGlobalBurmese, setNewGlobalBurmese] = useState('');
  const [newGlobalPart, setNewGlobalPart] = useState('Noun');
  const [newGlobalNotes, setNewGlobalNotes] = useState('');
  const [isSubmittingGlobal, setIsSubmittingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fetchGlobalVocabulary = useCallback(async () => {
    if (!currentUser) return;
    setGlobalLoading(true);
    try {
      setGlobalVocabularyList(await api.get<any[]>('/api/global-vocabulary'));
    } catch (error) {
      console.error('Failed to fetch global vocabulary', error);
    } finally {
      setGlobalLoading(false);
    }
  }, [currentUser]);

  const handleAddGlobalVocabulary = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    setGlobalError(null);
    if (!newGlobalEnglish.trim() || !newGlobalBurmese.trim()) {
      setGlobalError('English စကားလုံးနှင့် မြန်မာဘာသာပြန်ချက် နှစ်ခုလုံး ဖြည့်ရပါမည်။');
      return;
    }

    setIsSubmittingGlobal(true);
    try {
      await api.post('/api/global-vocabulary', {
        englishWord: newGlobalEnglish.trim(),
        burmeseTranslation: newGlobalBurmese.trim(),
        partOfSpeech: newGlobalPart,
        notes: newGlobalNotes.trim(),
      });
      setNewGlobalEnglish('');
      setNewGlobalBurmese('');
      setNewGlobalNotes('');
      await fetchGlobalVocabulary();
    } catch (error: any) {
      setGlobalError(error.message);
    } finally {
      setIsSubmittingGlobal(false);
    }
  }, [fetchGlobalVocabulary, newGlobalBurmese, newGlobalEnglish, newGlobalNotes, newGlobalPart]);

  const handleDeleteGlobalVocabulary = useCallback(async (id: number) => {
    if (!window.confirm('ဤဂလိုဘယ်ဝေါဟာရကို ဖျက်ဆီးရန် အတည်ပြုပါသလား?')) return;
    try {
      await api.delete(`/api/global-vocabulary/${id}`);
      await fetchGlobalVocabulary();
    } catch (error) {
      console.error(error);
    }
  }, [fetchGlobalVocabulary]);

  return {
    globalVocabularyList,
    globalLoading,
    newGlobalEnglish,
    setNewGlobalEnglish,
    newGlobalBurmese,
    setNewGlobalBurmese,
    newGlobalPart,
    setNewGlobalPart,
    newGlobalNotes,
    setNewGlobalNotes,
    isSubmittingGlobal,
    globalError,
    setGlobalError,
    fetchGlobalVocabulary,
    handleAddGlobalVocabulary,
    handleDeleteGlobalVocabulary,
  };
}
