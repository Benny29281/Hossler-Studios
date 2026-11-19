import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export const token = () => randomBytes(32).toString('hex');
export const digest = (value) => createHash('sha256').update(value).digest('hex');

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64)).toString('hex');
}

export async function verifyPassword(password, stored) {
  const [salt, key] = stored.split(':');
  const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, 'hex'));
}

export function sameSecret(left, right) {
  return typeof left === 'string' && typeof right === 'string' &&
    timingSafeEqual(Buffer.from(digest(left)), Buffer.from(digest(right)));
}
