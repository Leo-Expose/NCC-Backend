import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import authRoutes from '../src/routes/auth.routes';
import usersRoutes from '../src/routes/users.routes';
import attendanceRoutes from '../src/routes/attendance.routes';
import eventsRoutes from '../src/routes/events.routes';
import academicsRoutes from '../src/routes/academics.routes';
import quizzesRoutes from '../src/routes/quizzes.routes';
import communityRoutes from '../src/routes/community.routes';
import resourcesRoutes from '../src/routes/resources.routes';
import feedbackRoutes from '../src/routes/feedback.routes';
import ranksRoutes from '../src/routes/ranks.routes';
import settingsRoutes from '../src/routes/settings.routes';
import { errorHandler } from '../src/middlewares/error.middleware';

dotenv.config();

const app = express();

// ─── Global Middlewares ────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// ─── Health Check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'NCC-ERP Backend API',
  });
});

// ─── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ranks', ranksRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', settingsRoutes); // system endpoints share the settings router

// ─── 404 Handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ─── Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ─── Local Dev Server ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n  🚀 NCC-ERP Backend API running at http://localhost:${PORT}`);
    console.log(`  📡 Health check: http://localhost:${PORT}/api/health\n`);
  });
}

export default app;
