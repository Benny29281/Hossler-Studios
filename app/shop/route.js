export function GET(request) {
  return new Response(null, { status: 308, headers: { Location: '/' + request.nextUrl.search } });
}
