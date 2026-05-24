import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a private chat room
    socket.on('join_chat', ({ chatId }) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    // Send message
    socket.on('send_message', (messageData) => {
      io.to(messageData.chatId).emit('receive_message', messageData);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}

export { io };