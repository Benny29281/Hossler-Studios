import { journeyPath } from '../../../lib/content.mjs';

export function GET() {
  return new Response(null, { status: 308, headers: { Location: journeyPath } });
}
