import { sameSecret } from '../../../lib/crypto.mjs';
import { rows } from '../../../lib/db.mjs';
import { deliverOutbox, reconcile } from '../../../lib/orders.mjs';

export async function GET(request) {
  if (!process.env.CRON_SECRET || !sameSecret(request.headers.get('authorization'), 'Bearer ' + process.env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const pending = await rows(`SELECT number FROM orders WHERE status='pending'
    AND (expires_at<=now() OR payment_url IS NOT NULL) ORDER BY expires_at LIMIT 50`);
  let failures = 0;
  for (const order of pending) {
    try { await reconcile(order.number); }
    catch (error) { console.error('Payment reconciliation', order.number, error.message); failures += 1; }
  }
  await rows('DELETE FROM rate_limits WHERE expires_at<now()');
  await rows('DELETE FROM sessions WHERE expires_at<now()');
  await rows('DELETE FROM password_resets WHERE expires_at<now()');
  const pendingEmail = await deliverOutbox();
  return Response.json({ checked: pending.length, failures, pendingEmail });
}
