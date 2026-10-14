import { Router } from 'express';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { globalVocabulary, newsFeedbacks, newsScripts, userCorrections } from '../../db/schema.ts';
import { optionalAuth, requireAuth, AuthRequest } from '../../middleware/auth.ts';
import { GenerationQueue } from '../../services/generationQueue.ts';

export function createDataRouter(generationQueue: GenerationQueue) {
  const router = Router();

  router.get('/news-scripts', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const scripts = await db.select().from(newsScripts)
        .where(eq(newsScripts.userId, req.dbUser.id))
        .orderBy(desc(newsScripts.createdAt));
      res.json(scripts);
    } catch (error) {
      console.error('Failed to fetch news-scripts:', error);
      res.status(500).json({ error: 'Database query failed. Please try again later.' });
    }
  });

  router.post('/news-scripts', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const { title, content, category, originalInput, scriptType } = req.body;
      if (!title || !content || !scriptType) {
        return res.status(400).json({ error: 'Missing required fields (title, content, scriptType)' });
      }
      const [newScript] = await db.insert(newsScripts).values({
        userId: req.dbUser.id, title, content, category, originalInput, scriptType,
      }).returning();
      res.status(201).json(newScript);
    } catch (error) {
      console.error('Failed to create news script:', error);
      res.status(500).json({ error: 'Database insert failed. Please try again later.' });
    }
  });

  router.delete('/news-scripts/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const id = Number.parseInt(String(req.params.id), 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid script ID' });
      const deleted = await db.delete(newsScripts).where(eq(newsScripts.id, id)).returning();
      if (deleted.length === 0) return res.status(404).json({ error: 'News script not found or already deleted' });
      res.json({ success: true, deleted: deleted[0] });
    } catch (error) {
      console.error('Failed to delete news script:', error);
      res.status(500).json({ error: 'Database delete failed. Please try again later.' });
    }
  });

  router.get('/user/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const isAdmin = req.dbUser.email === 'axiom.data7@gmail.com';
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await db.delete(newsScripts).where(and(
        eq(newsScripts.userId, req.dbUser.id),
        lt(newsScripts.createdAt, thirtyDaysAgo),
      ));
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const scriptsGeneratedToday = await db.select().from(newsScripts).where(and(
        eq(newsScripts.userId, req.dbUser.id),
        gte(newsScripts.createdAt, todayStart),
      ));
      res.json({
        user: { id: req.dbUser.id, email: req.dbUser.email, uid: req.dbUser.uid, createdAt: req.dbUser.createdAt, isAdmin },
        usageToday: scriptsGeneratedToday.length,
        limit: 30,
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  router.get('/user-corrections', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const corrections = await db.select().from(userCorrections)
        .where(eq(userCorrections.userId, req.dbUser.id))
        .orderBy(desc(userCorrections.createdAt));
      res.json(corrections);
    } catch (error) {
      console.error('Failed to fetch user corrections:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  router.post('/user-corrections', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const { originalWord, correctedWord } = req.body;
      if (!originalWord?.trim() || !correctedWord?.trim()) {
        return res.status(400).json({ error: 'Both original word and corrected word are required' });
      }
      const [newCorrection] = await db.insert(userCorrections).values({
        userId: req.dbUser.id, originalWord: originalWord.trim(), correctedWord: correctedWord.trim(), isEnabled: true,
      }).returning();
      res.status(201).json(newCorrection);
    } catch (error) {
      console.error('Failed to add correction:', error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  router.put('/user-corrections/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const id = Number.parseInt(String(req.params.id), 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const [updated] = await db.update(userCorrections).set({ isEnabled: !!req.body.isEnabled })
        .where(and(eq(userCorrections.id, id), eq(userCorrections.userId, req.dbUser.id))).returning();
      if (!updated) return res.status(404).json({ error: 'Correction not found' });
      res.json(updated);
    } catch (error) {
      console.error('Failed to update correction:', error);
      res.status(500).json({ error: 'Database update failed' });
    }
  });

  router.delete('/user-corrections/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const id = Number.parseInt(String(req.params.id), 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await db.delete(userCorrections).where(and(
        eq(userCorrections.id, id), eq(userCorrections.userId, req.dbUser.id),
      )).returning();
      if (deleted.length === 0) return res.status(404).json({ error: 'Correction not found' });
      res.json({ success: true, deleted: deleted[0] });
    } catch (error) {
      console.error('Failed to delete correction:', error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  router.post('/news-feedbacks', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      const { rating, originalText, comment, wrongWord, correctedWord } = req.body;
      if (!rating) return res.status(400).json({ error: 'Rating is required' });
      const [newFeedback] = await db.insert(newsFeedbacks).values({
        userId: req.dbUser.id, rating, originalText, comment, wrongWord, correctedWord,
      }).returning();
      if (wrongWord?.trim() && correctedWord?.trim()) {
        try {
          await db.insert(userCorrections).values({
            userId: req.dbUser.id, originalWord: wrongWord.trim(), correctedWord: correctedWord.trim(), isEnabled: true,
          });
        } catch (dictionaryError) {
          console.warn('Auto dictionary insert on feedback failed:', dictionaryError);
        }
      }
      res.status(201).json(newFeedback);
    } catch (error) {
      console.error('Failed to submit news feedback:', error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  router.get('/global-vocabulary', requireAuth, async (_req: AuthRequest, res) => {
    try {
      res.json(await db.select().from(globalVocabulary).orderBy(desc(globalVocabulary.createdAt)));
    } catch (error) {
      console.error('Failed to fetch global vocabulary:', error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  router.post('/global-vocabulary', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      if (req.dbUser.email !== 'axiom.data7@gmail.com') {
        return res.status(403).json({ error: 'Access denied: Only the Super Admin (axiom.data7@gmail.com) is allowed to add global vocabulary terms.' });
      }
      const { englishWord, burmeseTranslation, partOfSpeech, notes } = req.body;
      if (!englishWord?.trim() || !burmeseTranslation?.trim()) {
        return res.status(400).json({ error: 'English word and Burmese translation are required' });
      }
      const [newWord] = await db.insert(globalVocabulary).values({
        englishWord: englishWord.trim(), burmeseTranslation: burmeseTranslation.trim(), partOfSpeech: partOfSpeech || 'General', notes, addedBy: req.dbUser.id,
      }).returning();
      res.status(201).json(newWord);
    } catch (error) {
      console.error('Failed to add global vocabulary word:', error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  router.delete('/global-vocabulary/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(404).json({ error: 'User registration not found in DB' });
      if (req.dbUser.email !== 'axiom.data7@gmail.com') {
        return res.status(403).json({ error: 'Access denied: Only the Super Admin is allowed to delete global vocabulary terms.' });
      }
      const id = Number.parseInt(String(req.params.id), 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const deleted = await db.delete(globalVocabulary).where(eq(globalVocabulary.id, id)).returning();
      if (deleted.length === 0) return res.status(404).json({ error: 'Vocabulary term not found' });
      res.json({ success: true, deleted: deleted[0] });
    } catch (error) {
      console.error('Failed to delete global vocabulary term:', error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  router.get('/queue-status', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const userKey = req.dbUser?.email || req.user?.email || req.ip || 'Anonymous User';
      res.json(generationQueue.getStatus(userKey));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
