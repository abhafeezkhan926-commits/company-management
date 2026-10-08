import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
export function connectSocket(token: string) {
  socket?.disconnect();
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token } });
  return socket;
}
export function disconnectSocket() { socket?.disconnect(); socket = null; }
export function getSocket() { return socket; }
