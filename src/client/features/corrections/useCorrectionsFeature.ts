import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/apiClient';

export function useCorrectionsFeature({ currentUser }: { currentUser: unknown }) {
  const [userCorrectionsList, setUserCorrectionsList] = useState<any[]>([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [newWrongWord, setNewWrongWord] = useState('');
  const [newCorrectedWord, setNewCorrectedWord] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const fetchUserCorrections = useCallback(async () => {
    if (!currentUser) return;
    setCorrectionsLoading(true);
    try {
      setUserCorrectionsList(await api.get<any[]>('/api/user-corrections'));
    } catch (error) {
      console.error('Failed to fetch user corrections', error);
    } finally {
      setCorrectionsLoading(false);
    }
  }, [currentUser]);

  const handleAddUserCorrection = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    setCorrectionError(null);
    if (!newWrongWord.trim() || !newCorrectedWord.trim()) {
      setCorrectionError('ကျေးဇူးပြု၍ စကားလုံးအလွဲနှင့် စကားလုံးအမှန် နှစ်ဖက်စလုံးကို ယှဉ်တွဲဖြည့်စွက်ပေးပါ။');
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      await api.post('/api/user-corrections', {
        originalWord: newWrongWord.trim(),
        correctedWord: newCorrectedWord.trim(),
      });
      setNewWrongWord('');
      setNewCorrectedWord('');
      await fetchUserCorrections();
    } catch (error: any) {
      setCorrectionError(error.message);
    } finally {
      setIsSubmittingCorrection(false);
    }
  }, [fetchUserCorrections, newCorrectedWord, newWrongWord]);

  const handleToggleCorrection = useCallback(async (id: number, currentEnabled: boolean) => {
    try {
      await api.put(`/api/user-corrections/${id}`, { isEnabled: !currentEnabled });
      await fetchUserCorrections();
    } catch (error) {
      console.error(error);
    }
  }, [fetchUserCorrections]);

  const handleDeleteCorrection = useCallback(async (id: number) => {
    if (!window.confirm('ဤပြင်ဆင်မှုစည်းကမ်းကို လုံးဝဖြုတ်ပစ်ရန် သေချာပါသလား?')) return;
    try {
      await api.delete(`/api/user-corrections/${id}`);
      await fetchUserCorrections();
    } catch (error) {
      console.error(error);
    }
  }, [fetchUserCorrections]);

  return {
    userCorrectionsList,
    correctionsLoading,
    newWrongWord,
    setNewWrongWord,
    newCorrectedWord,
    setNewCorrectedWord,
    isSubmittingCorrection,
    correctionError,
    setCorrectionError,
    fetchUserCorrections,
    handleAddUserCorrection,
    handleToggleCorrection,
    handleDeleteCorrection,
  };
}
