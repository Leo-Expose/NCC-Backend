import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middlewares/error.middleware';
import { logAudit, getClientIp } from '../middlewares/audit.middleware';
import { z } from 'zod';

/**
 * POST /api/settings/avatar
 * Upload and replace profile picture.
 * Expects file_url after frontend has uploaded to Supabase Storage.
 */
export const updateAvatar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    file_url: z.string().url(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'file_url is required' });
    return;
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ profile_photo_url: parsed.data.file_url, updated_at: new Date().toISOString() })
    .eq('id', req.user!.id);

  if (error) throw new AppError('Failed to update avatar', 500);

  res.json({ message: 'Avatar updated successfully', file_url: parsed.data.file_url });
});

/**
 * PUT /api/settings/password
 * Update current password.
 */
export const updatePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8)
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Verify current password by attempting sign-in
  const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
    email: req.user!.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  // Update password via admin API
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.user!.id, {
    password: parsed.data.newPassword,
  });

  if (updateError) throw new AppError(`Failed to update password: ${updateError.message}`, 500);

  res.json({ message: 'Password updated successfully' });
});

/**
 * PUT /api/settings/preferences
 * Save notification toggle preferences.
 */
export const updatePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    email_alerts: z.boolean().optional(),
    push_notifications: z.boolean().optional(),
    attendance_reminders: z.boolean().optional(),
    event_reminders: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { error } = await supabaseAdmin
    .from('user_preferences')
    .upsert({
      user_id: req.user!.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw new AppError('Failed to update preferences', 500);

  res.json({ message: 'Preferences saved successfully' });
});

/**
 * GET /api/system/audit
 * Fetch audit logs. Admin only.
 */
export const getAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { limit = '50', action, actor_id } = req.query;

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*, users!audit_logs_actor_id_fkey(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(Math.min(200, parseInt(limit as string)));

  if (action) query = query.ilike('action', `%${action}%`);
  if (actor_id) query = query.eq('actor_id', actor_id as string);

  const { data, error } = await query;
  if (error) throw new AppError('Failed to fetch audit logs', 500);

  res.json({ logs: data });
});

/**
 * POST /api/system/export
 * Generate a PDF export for attendance or marks data.
 */
export const exportData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    type: z.enum(['attendance', 'marks']),
    company: z.string().optional(),
    wing: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  let reportData: any[] = [];
  let reportTitle = '';

  if (parsed.data.type === 'attendance') {
    reportTitle = 'Attendance Report';
    let query = supabaseAdmin
      .from('attendance')
      .select('*, users!attendance_cadet_id_fkey(full_name, chest_number, company, wing), attendance_sessions(date, type)')
      .order('created_at', { ascending: false });

    if (parsed.data.company) {
      query = query.eq('users.company', parsed.data.company);
    }

    const { data, error } = await query;
    if (error) throw new AppError('Failed to fetch attendance data', 500);
    reportData = data || [];
  } else {
    reportTitle = 'Marks Report';
    const { data, error } = await supabaseAdmin
      .from('cadet_marks')
      .select('*, users!cadet_marks_cadet_id_fkey(full_name, chest_number, company)')
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch marks data', 500);
    reportData = data || [];
  }

  // Generate HTML for PDF
  const htmlContent = generateReportHtml(reportTitle, parsed.data.type, reportData, parsed.data);

  await logAudit(req.user!.id, `export.${parsed.data.type}`, 'system', null, parsed.data, getClientIp(req));

  // Return HTML content with proper headers for the frontend to render as PDF
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${parsed.data.type}_report_${new Date().toISOString().split('T')[0]}.html"`);
  res.send(htmlContent);
});

/**
 * Generate a clean, formatted HTML report suitable for PDF conversion
 */
function generateReportHtml(
  title: string,
  type: string,
  data: any[],
  filters: any
): string {
  const now = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  let tableHeaders = '';
  let tableRows = '';

  if (type === 'attendance') {
    tableHeaders = `
      <th>S.No</th>
      <th>Cadet Name</th>
      <th>Chest No.</th>
      <th>Company</th>
      <th>Session Date</th>
      <th>Session Type</th>
      <th>Status</th>
    `;
    tableRows = data.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${row.users?.full_name || 'N/A'}</td>
        <td>${row.users?.chest_number || 'N/A'}</td>
        <td>${row.users?.company || 'N/A'}</td>
        <td>${row.attendance_sessions?.date || 'N/A'}</td>
        <td>${row.attendance_sessions?.type || 'N/A'}</td>
        <td class="status-${row.status}">${(row.status || '').toUpperCase()}</td>
      </tr>
    `).join('');
  } else {
    tableHeaders = `
      <th>S.No</th>
      <th>Cadet Name</th>
      <th>Chest No.</th>
      <th>Company</th>
      <th>Drill</th>
      <th>Weapons</th>
      <th>Map Reading</th>
      <th>Fieldcraft</th>
      <th>National Integration</th>
    `;
    tableRows = data.map((row, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${row.users?.full_name || 'N/A'}</td>
        <td>${row.users?.chest_number || 'N/A'}</td>
        <td>${row.users?.company || 'N/A'}</td>
        <td>${row.drill ?? '-'}</td>
        <td>${row.weapons ?? '-'}</td>
        <td>${row.map_reading ?? '-'}</td>
        <td>${row.fieldcraft ?? '-'}</td>
        <td>${row.national_integration ?? '-'}</td>
      </tr>
    `).join('');
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — NCC Unit</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #1a1a2e;
      background: #fff;
      padding: 40px;
      line-height: 1.6;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0f3460;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #0f3460;
    }

    .header .subtitle {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }

    .header .logo {
      text-align: right;
    }

    .header .logo .ncc {
      font-size: 28px;
      font-weight: 800;
      color: #0f3460;
      letter-spacing: 2px;
    }

    .header .logo .tagline {
      font-size: 10px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .meta {
      display: flex;
      gap: 30px;
      margin-bottom: 25px;
      font-size: 13px;
      color: #555;
    }

    .meta span { font-weight: 600; color: #1a1a2e; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    thead { background: #0f3460; }
    
    th {
      color: #fff;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 9px 12px;
      border-bottom: 1px solid #e8e8e8;
    }

    tr:nth-child(even) { background: #f8f9fc; }
    tr:hover { background: #eef1f8; }

    .status-present { color: #0a8754; font-weight: 600; }
    .status-absent { color: #d32f2f; font-weight: 600; }
    .status-late { color: #f57c00; font-weight: 600; }
    .status-excused { color: #1565c0; font-weight: 600; }

    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #999;
      display: flex;
      justify-content: space-between;
    }

    .summary {
      margin-top: 20px;
      padding: 15px;
      background: #f0f4ff;
      border-radius: 8px;
      font-size: 13px;
    }

    .summary strong { color: #0f3460; }

    @media print {
      body { padding: 20px; }
      tr:hover { background: inherit; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${title}</h1>
      <div class="subtitle">Generated on ${now}</div>
    </div>
    <div class="logo">
      <div class="ncc">NCC</div>
      <div class="tagline">Digital Command Platform</div>
    </div>
  </div>

  <div class="meta">
    <div>Total Records: <span>${data.length}</span></div>
    ${filters.company ? `<div>Company: <span>${filters.company}</span></div>` : ''}
    ${filters.wing ? `<div>Wing: <span>${filters.wing}</span></div>` : ''}
    ${filters.date_from ? `<div>From: <span>${filters.date_from}</span></div>` : ''}
    ${filters.date_to ? `<div>To: <span>${filters.date_to}</span></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>${tableHeaders}</tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">No records found</td></tr>'}
    </tbody>
  </table>

  ${type === 'attendance' ? `
  <div class="summary">
    <strong>Summary:</strong>
    Present: ${data.filter((r) => r.status === 'present').length} |
    Absent: ${data.filter((r) => r.status === 'absent').length} |
    Late: ${data.filter((r) => r.status === 'late').length} |
    Excused: ${data.filter((r) => r.status === 'excused').length}
  </div>` : ''}

  <div class="footer">
    <div>NCC Digital Command &amp; Management Platform</div>
    <div>Confidential — For official use only</div>
  </div>
</body>
</html>`;
}
