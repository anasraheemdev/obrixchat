export default function socketLogic(io) {
    const users = new Map(); // email -> socketId
    const roomsParticipants = new Map(); // roomId -> Set of socketIds

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('identify', (email) => {
            users.set(email, socket.id);
            socket.join(email);
            console.log(`User ${email} identified`);
        });

        // --- Private Messaging ---
        socket.on('join_chat', (chatId) => {
            socket.join(`chat_${chatId}`);
        });

        socket.on('send_message', (message) => {
            io.to(`chat_${message.chat_id}`).emit('receive_message', message);
        });

        // --- Private Room Invitations ---
        socket.on('send-invite', (invite) => {
            // invite: { invitee_email, inviter_email, room_name, room_id }
            io.to(invite.invitee_email).emit('new-invite', invite);
        });

        // --- Private Room/Study Room Logic ---
        socket.on('join-room', async ({ roomId, userEmail, userName, userAvatar }) => {
            // TODO: Add database check here for room membership authorization
            socket.join(roomId);
            if (!roomsParticipants.has(roomId)) {
                roomsParticipants.set(roomId, new Set());
            }
            roomsParticipants.get(roomId).add(socket.id);

            socket.to(roomId).emit('user-joined', {
                socketId: socket.id,
                userEmail,
                userName,
                userAvatar
            });

            const participants = Array.from(roomsParticipants.get(roomId))
                .filter(id => id !== socket.id);
            socket.emit('current-participants', participants);
        });

        socket.on('kick-participant', ({ roomId, targetEmail }) => {
            // Only room owner logic should trigger this on client side
            io.to(targetEmail).emit('kicked-from-room', { roomId });
        });

        socket.on('leave-room', (roomId) => {
            socket.leave(roomId);
            if (roomsParticipants.has(roomId)) {
                roomsParticipants.get(roomId).delete(socket.id);
                socket.to(roomId).emit('user-left', socket.id);
            }
        });

        // --- 1-on-1 Calling ---
        socket.on('call-user', (data) => {
            // data: { to, from, type, roomId, callerName, callerAvatar }
            console.log(`Call from ${data.from} to ${data.to}`);
            io.to(data.to).emit('incoming-call', data);
        });

        socket.on('reject-call', (data) => {
            // data: { to, from }
            io.to(data.to).emit('call-rejected', { from: data.from });
        });

        // --- Signaling ---
        socket.on('webrtc-signal', ({ to, from, signal, type }) => {
            // 'to' can be an email or a socket ID
            io.to(to).emit('webrtc-signal', { from: socket.id, fromEmail: from, signal, type });
        });

        socket.on('disconnect', () => {
            for (let [email, id] of users.entries()) {
                if (id === socket.id) {
                    users.delete(email);
                    break;
                }
            }
            roomsParticipants.forEach((participants, roomId) => {
                if (participants.has(socket.id)) {
                    participants.delete(socket.id);
                    socket.to(roomId).emit('user-left', socket.id);
                }
            });
        });
    });
}
