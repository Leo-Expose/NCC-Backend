import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { supabaseAdmin } from '../config/supabase';

/**
 * Logs an action to the audit_logs table for accountability.
 */
export const logAudit = async (
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string | string[] | null,
  payload: Record<string, any> | null,
  ipAddress: string
): Promise<void> => {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: actorId,
      action,
      target_table: targetTable,
      target_id: Array.isArray(targetId) ? targetId[0] : targetId,
      payload,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error('[AUDIT] Failed to log audit entry:', err);
  }
};

/**
 * Helper to extract client IP from request
 */
export const getClientIp = (req: AuthenticatedRequest): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
};
