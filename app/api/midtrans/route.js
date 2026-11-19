import { reconcile } from '../../../lib/orders.mjs';
import { verifyNotification } from '../../../lib/providers.mjs';

export async function POST(request) {
  try {
    const data = await request.json();
    if (!data || !verifyNotification(data)) return Response.json({ error: 'Invalid signature' }, { status: 403 });
    await reconcile(data.order_id);
    return Response.json({ received: true });
  } catch (error) {
    console.error('Midtrans notification', error.message);
    return Response.json({ error: 'Retry later' }, { status: 502 });
  }
}
