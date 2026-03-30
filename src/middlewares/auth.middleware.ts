import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Extend Express Request to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name: string;
    company: string | null;
    wing: string | null;
    is_active: boolean;
  };
  token?: string;
}

/**
 * Middleware: requireAuth
 * Extracts Bearer token, verifies via Supabase, and attaches user profile to req.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT with Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch the full user profile from the public.users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, company, wing, is_active')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({ error: 'User profile not found. Account may not be fully set up.' });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({ error: 'Account is deactivated. Contact your ANO.' });
      return;
    }

    req.user = profile;
    req.token = token;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication service failure' });
  }
};

/**
 * Middleware Factory: requireRole
 * Checks that the authenticated user has one of the allowed roles.
 * Must be used AFTER requireAuth.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Normalize: 'ano' includes 'suo' for officer-level access
    const effectiveRoles = [...allowedRoles];
    if (effectiveRoles.includes('officer+')) {
      effectiveRoles.push('ano', 'suo', 'admin');
    }

    if (!effectiveRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }

    next();
  };
};
