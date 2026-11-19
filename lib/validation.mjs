import { z } from 'zod';
import { maxPasswordLength, minPasswordLength, newPasswordHint, newPasswordPattern } from './password-policy.mjs';

export const str = (max = 200, min = 1) => z.string().trim().min(min).max(max);
export const optional = (max = 200) => str(max, 0).optional().default('');
export const email = z.string().trim().toLowerCase().max(254).email();
export const loginPassword = z.string().min(minPasswordLength).max(128);
const newPasswordExpression = new RegExp('^' + newPasswordPattern + '(?![\\s\\S])', 'u');
export const newPassword = z.string().refine((value) => value.length >= minPasswordLength &&
  value.length <= maxPasswordLength && newPasswordExpression.test(value), newPasswordHint);
export const phone = str(24).regex(/^\+?[0-9][0-9 ()-]{7,22}$/);
export const postal = z.string().regex(/^\d{5}$/);
export const uuid = z.uuid();
export const slug = str(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const integer = (max, min = 0) => z.coerce.number().int().min(min).max(max);
export const image = str(500).refine((value) =>
  /^\/images\/[a-z0-9._-]+$/i.test(value) || z.url({ protocol: /^https$/ }).safeParse(value).success,
  'Gunakan URL HTTPS atau path /images/.');
export const address = z.object({
  name: str(100), phone, province: str(100), city: str(100), district: str(100),
  postal, detail: str(400, 8), districtCode: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/).optional(),
});
