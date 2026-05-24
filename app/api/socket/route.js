import { initSocket } from '@/lib/socket';

export async function GET(req) {
  // This is just to initialize the socket server
  return new Response('Socket.io server is running');
}