import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { db, first, rows } from './db.mjs';
import { digest, hashPassword, token, verifyPassword } from './crypto.mjs';
import { cookieOptions, fail, limit } from './shop.mjs';
import { emailMessage } from './providers.mjs';

export async function authenticate(actor, input, register = false) {
  await limit('auth:' + digest(input.email), 12, 900);
  let user = await first('SELECT * FROM users WHERE email=$1', [input.email]);
  if (register) {
    if (user) fail('Email sudah digunakan.', 409);
    user = await first(`INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)
      ON CONFLICT DO NOTHING RETURNING id`, [
      randomUUID(), input.name, input.email, await hashPassword(input.password),
    ]);
    if (!user) fail('Email sudah digunakan.', 409);
  } else if (!user || !await verifyPassword(input.password, user.password_hash)) {
    fail('Email atau kata sandi salah.', 401);
  }

  const jar = await cookies();
  const previous = jar.get('hs_session')?.value;
  const session = token();
  await (await db()).transaction(async (connection) => {
    if (previous) await rows('DELETE FROM sessions WHERE token=$1', [digest(previous)], connection);
    await rows("INSERT INTO sessions VALUES($1,$2,now()+interval '30 days')", [digest(session), user.id], connection);
    if (actor.guestOwner) {
      await rows(`INSERT INTO cart_items AS c (owner,variant_id,qty)
        SELECT $1,variant_id,qty FROM cart_items WHERE owner=$2
        ON CONFLICT(owner,variant_id) DO UPDATE SET qty=least(99,c.qty+excluded.qty)`,
      ['user:' + user.id, actor.guestOwner], connection);
      await rows('DELETE FROM cart_items WHERE owner=$1', [actor.guestOwner], connection);
      await rows('UPDATE orders SET user_id=$1,guest_owner=NULL WHERE guest_owner=$2 AND email=$3',
        [user.id, actor.guestOwner, input.email], connection);
    }
  });
  jar.set('hs_session', session, cookieOptions);
}

export async function logout() {
  const jar = await cookies();
  const session = jar.get('hs_session')?.value;
  if (session) await rows('DELETE FROM sessions WHERE token=$1', [digest(session)]);
  jar.delete('hs_session');
}

export async function requestReset(email) {
  await limit('reset:' + digest(email), 4, 1800);
  const user = await first('SELECT id FROM users WHERE email=$1', [email]);
  if (!user || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return;
  const code = token();
  await rows("INSERT INTO password_resets VALUES($1,$2,now()+interval '30 minutes')", [digest(code), user.id]);
  const url = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  await emailMessage(email, 'Atur ulang kata sandi Hossler Studios',
    'Tautan berlaku 30 menit. ' + url + '/account?reset=' + code, 'reset:' + digest(code));
}

export async function resetPassword(code, password) {
  const hash = await hashPassword(password);
  await (await db()).transaction(async (connection) => {
    const reset = await first('DELETE FROM password_resets WHERE token=$1 AND expires_at>now() RETURNING user_id',
      [digest(code)], connection);
    if (!reset) fail('Tautan sudah kedaluwarsa atau tidak valid.');
    await rows('UPDATE users SET password_hash=$2 WHERE id=$1', [reset.user_id, hash], connection);
    await rows('DELETE FROM sessions WHERE user_id=$1', [reset.user_id], connection);
    await rows('DELETE FROM password_resets WHERE user_id=$1', [reset.user_id], connection);
  });
}
