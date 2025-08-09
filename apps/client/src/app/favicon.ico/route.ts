export function GET() {
  // Avoid 404 noise in dev if no real favicon is provided
  return new Response(null, { status: 204 });
}
