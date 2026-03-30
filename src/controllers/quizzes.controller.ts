import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * GET /api/quizzes
 * List all quizzes. Filterable by status (published/draft).
 */
export const listQuizzes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, subject, wing } = req.query;

  let query = supabaseAdmin
    .from('quiz_sets')
    .select('*, quiz_questions(count)')
    .order('created_at', { ascending: false });

  // Only show published to cadets
  if (req.user!.role === 'cadet' || req.user!.role === 'suo') {
    query = query.eq('is_published', true);
  } else if (status === 'active') {
    query = query.eq('is_published', true);
  }

  if (subject) query = query.eq('subject', subject as string);
  if (wing) query = query.eq('wing', wing as string);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch quizzes', 500);

  // Get the user's best scores for each quiz
  if (req.user!.role === 'cadet' || req.user!.role === 'suo') {
    const quizIds = (data || []).map((q: any) => q.id);
    if (quizIds.length > 0) {
      const { data: attempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('quiz_set_id, score, total_questions')
        .eq('cadet_id', req.user!.id)
        .in('quiz_set_id', quizIds)
        .order('score', { ascending: false });

      const bestScores: Record<string, { score: number; total: number }> = {};
      for (const a of attempts || []) {
        if (!bestScores[a.quiz_set_id]) {
          bestScores[a.quiz_set_id] = { score: a.score, total: a.total_questions };
        }
      }

      const enriched = (data || []).map((q: any) => ({
        ...q,
        best_score: bestScores[q.id] || null,
      }));

      res.json({ quizzes: enriched });
      return;
    }
  }

  res.json({ quizzes: data });
});

/**
 * POST /api/quizzes
 * Create a new quiz with questions. Officer+ only.
 */
export const createQuiz = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const questionSchema = z.object({
    question_text: z.string().min(1),
    option_a: z.string().min(1),
    option_b: z.string().min(1),
    option_c: z.string().optional(),
    option_d: z.string().optional(),
    correct_option: z.enum(['a', 'b', 'c', 'd']),
    explanation: z.string().optional(),
    image_url: z.string().url().optional(),
  });

  const schema = z.object({
    title: z.string().min(1).max(200),
    subject: z.string().min(1),
    description: z.string().optional(),
    wing: z.enum(['army', 'navy', 'air_force', 'all']).default('all'),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    time_limit_minutes: z.number().min(1).optional(),
    questions: z.array(questionSchema).min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Create the quiz set
  const { data: quizSet, error: quizError } = await supabaseAdmin
    .from('quiz_sets')
    .insert({
      title: parsed.data.title,
      subject: parsed.data.subject,
      wing: parsed.data.wing,
      difficulty: parsed.data.difficulty,
      time_limit_minutes: parsed.data.time_limit_minutes || null,
      is_published: true,
      created_by: req.user!.id,
    })
    .select()
    .single();

  if (quizError) throw new AppError(`Failed to create quiz: ${quizError.message}`, 500);

  // Insert questions
  const questions = parsed.data.questions.map((q, index) => ({
    quiz_set_id: quizSet.id,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c || null,
    option_d: q.option_d || null,
    correct_option: q.correct_option,
    explanation: q.explanation || null,
    image_url: q.image_url || null,
    order_index: index + 1,
  }));

  const { error: qError } = await supabaseAdmin.from('quiz_questions').insert(questions);
  if (qError) throw new AppError(`Failed to insert questions: ${qError.message}`, 500);

  await logAudit(req.user!.id, 'quiz.create', 'quiz_sets', quizSet.id, { title: parsed.data.title, questionCount: questions.length }, getClientIp(req));

  res.status(201).json({ quiz: quizSet, questionCount: questions.length });
});

/**
 * GET /api/quizzes/:id
 * Fetch full quiz structure with questions.
 */
export const getQuizById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: quiz, error: quizError } = await supabaseAdmin
    .from('quiz_sets')
    .select('*')
    .eq('id', id)
    .single();

  if (quizError || !quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const { data: questions, error: qError } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('quiz_set_id', id)
    .order('order_index', { ascending: true });

  if (qError) throw new AppError('Failed to fetch questions', 500);

  // For cadets, don't reveal correct answers until submission
  const sanitized = (questions || []).map((q: any) => {
    if (['cadet', 'suo'].includes(req.user!.role)) {
      const { correct_option, explanation, ...safe } = q;
      return safe;
    }
    return q;
  });

  res.json({ quiz, questions: sanitized });
});

/**
 * POST /api/quizzes/:id/submit
 * Submit cadet answers and calculate score.
 */
export const submitQuiz = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const schema = z.object({
    answers: z.array(z.object({
      questionId: z.string().uuid(),
      answer: z.enum(['a', 'b', 'c', 'd']),
    })),
    started_at: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Fetch correct answers
  const { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, correct_option, explanation')
    .eq('quiz_set_id', id);

  if (!questions || questions.length === 0) {
    res.status(404).json({ error: 'Quiz questions not found' });
    return;
  }

  const correctMap: Record<string, { correct: string; explanation: string | null }> = {};
  for (const q of questions) {
    correctMap[q.id] = { correct: q.correct_option, explanation: q.explanation };
  }

  // Grade
  let score = 0;
  const gradedAnswers = parsed.data.answers.map((a) => {
    const correct = correctMap[a.questionId]?.correct === a.answer;
    if (correct) score++;
    return {
      question_id: a.questionId,
      selected: a.answer,
      correct,
      explanation: correctMap[a.questionId]?.explanation || null,
    };
  });

  // Save attempt
  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from('quiz_attempts')
    .insert({
      quiz_set_id: id,
      cadet_id: req.user!.id,
      score,
      total_questions: questions.length,
      answers: gradedAnswers,
      started_at: parsed.data.started_at,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (attemptError) throw new AppError(`Failed to save attempt: ${attemptError.message}`, 500);

  res.json({
    score,
    total: questions.length,
    percentage: Math.round((score / questions.length) * 100),
    answers: gradedAnswers,
    attemptId: attempt.id,
  });
});
