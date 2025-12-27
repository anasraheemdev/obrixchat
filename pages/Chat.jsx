import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { roomService } from '../services/roomService';
import UserList from '../components/UserList';
import ChatWindow from '../components/ChatWindow';
import IncomingCall from '../components/IncomingCall';
import MeetingRoom from '../components/MeetingRoom';
import {
    LogOut, MessageSquare, Search, Settings,
    Bell, Circle, GraduationCap, Video as VideoIcon,
    Plus, Users, X, Check, Mail, Info, Clock, Shield
} from 'lucide-react';
import io from 'socket.io-client';

let socket;

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

const Chat = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [myRooms, setMyRooms] = useState([]);
    const [myInvites, setMyInvites] = useState([]);

    const [selectedChat, setSelectedChat] = useState(null);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchError, setSearchError] = useState('');
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [tab, setTab] = useState('direct'); // 'direct', 'rooms', 'invites'

    // Creation State
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [roomForm, setRoomForm] = useState({ name: '', description: '' });

    // Calling & Meeting States
    const [ongoingCall, setOngoingCall] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null); // For incoming call modal
    const [joinedRoomData, setJoinedRoomData] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [peers, setPeers] = useState({});

    // Ref to always have current localStream in callbacks
    const localStreamRef = useRef(null);

    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Keep ref in sync with state
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        socket = io();

        socket.on('connect', () => {
            socket.emit('identify', user.email);
        });

        socket.on('new-invite', (invite) => {
            setMyInvites(prev => [invite, ...prev]);
        });

        // Incoming call handler
        socket.on('incoming-call', (data) => {
            console.log('Incoming call from:', data.from);
            setIncomingCall(data);
        });

        socket.on('kicked-from-room', ({ roomId }) => {
            if (joinedRoomData?.id === roomId) {
                alert('You have been removed from the room by the owner.');
                cleanupCall();
            }
        });

        socket.on('user-joined', async ({ socketId, userEmail, userName, userAvatar }) => {
            await createPeerConnection(socketId, userEmail, userName, userAvatar, true);
        });

        socket.on('webrtc-signal', async ({ from, fromEmail, signal }) => {
            if (signal.type === 'offer') {
                await handleOffer(from, fromEmail, signal);
            } else if (signal.type === 'answer') {
                if (peers[from]) await peers[from].setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                if (peers[from]) await peers[from].addIceCandidate(new RTCIceCandidate(signal));
            }
        });

        socket.on('user-left', (socketId) => {
            if (peers[socketId]) {
                peers[socketId].close();
                setPeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
                setRemoteStreams(prev => { const n = { ...prev }; delete n[socketId]; return n; });
            }
        });

        return () => socket.disconnect();
    }, [user.email, joinedRoomData, peers]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [c, p, r, i] = await Promise.all([
                    chatService.getChats(user.email),
                    authService.getCurrentUserProfile(user.id),
                    roomService.getMyRooms(user.email),
                    roomService.getMyInvites(user.email)
                ]);
                setChats(c);
                setCurrentUserProfile(p);
                setMyRooms(r);
                setMyInvites(i);
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, [user.email, user.id]);

    // --- WebRTC Logic ---
    const createPeerConnection = async (targetSocketId, email, name, avatar, isInitiator) => {
        console.log('Creating peer connection to:', targetSocketId, 'isInitiator:', isInitiator);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Use ref to get current stream
        const stream = localStreamRef.current;
        if (stream) {
            console.log('Adding local tracks:', stream.getTracks().length);
            stream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind, 'enabled:', track.enabled);
                pc.addTrack(track, stream);
            });
        } else {
            console.warn('No local stream available when creating peer connection');
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log('Sending ICE candidate to:', targetSocketId);
                socket.emit('webrtc-signal', { to: targetSocketId, from: user.email, signal: e.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
        };

        pc.ontrack = (e) => {
            console.log('Received remote track:', e.track.kind);
            setRemoteStreams(prev => ({
                ...prev,
                [targetSocketId]: { stream: e.streams[0], userEmail: email, userName: name, userAvatar: avatar }
            }));
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('Sending offer to:', targetSocketId);
            socket.emit('webrtc-signal', { to: targetSocketId, from: user.email, signal: offer });
        }

        setPeers(prev => ({ ...prev, [targetSocketId]: pc }));
        return pc;
    };

    const handleOffer = async (fromSocketId, fromEmail, offer) => {
        console.log('Handling offer from:', fromSocketId);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Use ref to get current stream
        const stream = localStreamRef.current;
        if (stream) {
            console.log('Adding local tracks for answer:', stream.getTracks().length);
            stream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind, 'enabled:', track.enabled);
                pc.addTrack(track, stream);
            });
        } else {
            console.warn('No local stream available when handling offer');
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log('Sending ICE candidate to:', fromSocketId);
                socket.emit('webrtc-signal', { to: fromSocketId, from: user.email, signal: e.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
        };

        pc.ontrack = (e) => {
            console.log('Received remote track:', e.track.kind);
            setRemoteStreams(prev => ({
                ...prev,
                [fromSocketId]: { stream: e.streams[0], userEmail: fromEmail, userName: 'Member', userAvatar: '' }
            }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Sending answer to:', fromSocketId);
        socket.emit('webrtc-signal', { to: fromSocketId, from: user.email, signal: answer });

        setPeers(prev => ({ ...prev, [fromSocketId]: pc }));
    };

    // --- Room Operations ---
    const createRoom = async (e) => {
        e.preventDefault();
        try {
            const room = await roomService.createRoom(roomForm.name, roomForm.description, user.email);
            setMyRooms(prev => [room, ...prev]);
            setShowCreateRoom(false);
            setRoomForm({ name: '', description: '' });
            joinRoom(room);
        } catch (err) { alert('Failed to create room'); }
    };

    const joinRoom = async (room) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            setJoinedRoomData(room);
            socket.emit('join-room', {
                roomId: room.id,
                userEmail: user.email,
                userName: currentUserProfile?.full_name || user.email.split('@')[0],
                userAvatar: currentUserProfile?.avatar_url
            });
        } catch (err) { alert('Camera/Mic permission required'); }
    };

    const respondInvite = async (invite, status) => {
        try {
            await roomService.respondToInvite(invite.id, status, invite.room_id, user.email);
            setMyInvites(prev => prev.filter(i => i.id !== invite.id));
            if (status === 'accepted') {
                const rooms = await roomService.getMyRooms(user.email);
                setMyRooms(rooms);
            }
        } catch (err) { console.error(err); }
    };

    const kickoff = (socketId, email) => {
        if (window.confirm(`Kick ${email} from the room?`)) {
            socket.emit('kick-participant', { roomId: joinedRoomData.id, targetEmail: email });
        }
    };

    const cleanupCall = () => {
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        Object.values(peers).forEach(pc => pc.close());
        setPeers({});
        setRemoteStreams({});
        setLocalStream(null);
        setJoinedRoomData(null);
    };

    // 1-on-1 Private Calling (from chat header)
    const initiatePrivateCall = async (type) => {
        if (!selectedChat) return;
        const otherEmail = selectedChat.user_1_email === user.email
            ? selectedChat.user_2_email
            : selectedChat.user_1_email;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            setLocalStream(stream);

            // Create a temporary "room" for this private call
            const privateRoomId = `private_${[user.email, otherEmail].sort().join('_')}`;
            setJoinedRoomData({
                id: privateRoomId,
                name: `Call with ${otherEmail}`,
                owner_email: user.email
            });

            socket.emit('join-room', {
                roomId: privateRoomId,
                userEmail: user.email,
                userName: currentUserProfile?.full_name || user.email.split('@')[0],
                userAvatar: currentUserProfile?.avatar_url
            });

            // Notify the other user
            socket.emit('call-user', {
                to: otherEmail,
                from: user.email,
                type,
                roomId: privateRoomId,
                callerName: currentUserProfile?.full_name,
                callerAvatar: currentUserProfile?.avatar_url
            });
        } catch (err) {
            alert('Camera/Microphone access required for calls');
        }
    };

    // Accept incoming call
    const acceptCall = async () => {
        if (!incomingCall) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: incomingCall.type === 'video',
                audio: true
            });
            setLocalStream(stream);

            setJoinedRoomData({
                id: incomingCall.roomId,
                name: `Call with ${incomingCall.from}`,
                owner_email: incomingCall.from
            });

            socket.emit('join-room', {
                roomId: incomingCall.roomId,
                userEmail: user.email,
                userName: currentUserProfile?.full_name || user.email.split('@')[0],
                userAvatar: currentUserProfile?.avatar_url
            });

            setIncomingCall(null);
        } catch (err) {
            alert('Camera/Microphone access required');
        }
    };

    // Reject incoming call
    const rejectCall = () => {
        socket.emit('reject-call', { to: incomingCall.from, from: user.email });
        setIncomingCall(null);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const foundUser = await authService.searchUser(searchEmail.toLowerCase());
            if (foundUser) {
                const chat = await chatService.createChat(user.email, foundUser.email);
                setChats(prev => [chat, ...prev.filter(c => c.id !== chat.id)]);
                setSelectedChat(chat);
                setSearchEmail('');
            } else { setSearchError('Not found'); }
        } catch (err) { setSearchError('Error'); }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
            {/* Incoming Call Modal */}
            {incomingCall && (
                <IncomingCall
                    callData={incomingCall}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                />
            )}

            {joinedRoomData && (
                <MeetingRoom
                    room={joinedRoomData}
                    currentUserEmail={user.email}
                    localStream={localStream}
                    remoteStreams={remoteStreams}
                    onEndCall={() => { socket.emit('leave-room', joinedRoomData.id); cleanupCall(); }}
                    onToggleMic={() => { localStream.getAudioTracks()[0].enabled = isMicMuted; setIsMicMuted(!isMicMuted); }}
                    onToggleVideo={() => { localStream.getVideoTracks()[0].enabled = isVideoOff; setIsVideoOff(!isVideoOff); }}
                    onShareScreen={() => { /* Screen share logic same as before */ }}
                    onKickMember={kickoff}
                    isMicMuted={isMicMuted}
                    isVideoOff={isVideoOff}
                    isScreenSharing={isScreenSharing}
                />
            )}

            {/* Sidebar */}
            <div className="w-80 border-r border-slate-800/40 flex flex-col bg-slate-900/20 backdrop-blur-3xl relative z-20">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg"><Plus className="w-4 h-4 text-white" /></div>
                            Obrix Rooms
                        </h2>
                        <div className="relative">
                            <Bell
                                onClick={() => setTab('invites')}
                                className={`w-5 h-5 cursor-pointer transition-colors ${tab === 'invites' ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`}
                            />
                            {myInvites.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
                        </div>
                    </div>

                    <nav className="flex bg-slate-900/50 p-1 rounded-2xl mb-6 border border-white/5 shadow-inner">
                        {['direct', 'rooms'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {t === 'direct' ? 'Messages' : 'My Rooms'}
                            </button>
                        ))}
                    </nav>

                    {tab === 'direct' && (
                        <form onSubmit={handleSearch} className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input type="email" placeholder="Search students..." className="w-full bg-slate-800/40 border border-slate-700/30 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                        </form>
                    )}

                    {tab === 'rooms' && (
                        <button onClick={() => setShowCreateRoom(true)} className="w-full py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center gap-3 text-xs font-black text-blue-400 hover:bg-blue-600/20 transition-all group">
                            <Plus className="w-4 h-4 group-rotate-90 transition-transform" /> CREATE ROOM
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                    {tab === 'direct' && <UserList chats={chats} onSelect={setSelectedChat} selectedChatId={selectedChat?.id} currentUserEmail={user.email} />}

                    {tab === 'rooms' && (
                        <div className="space-y-1 px-2">
                            {myRooms.map(room => (
                                <button key={room.id} onClick={() => joinRoom(room)} className="w-full px-4 py-4 rounded-2xl border border-transparent hover:border-white/5 hover:bg-white/[0.02] flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-500 font-black text-xs border border-white/5 uppercase">{room.name[0]}</div>
                                        <div className="text-left">
                                            <p className="text-xs font-black text-white uppercase tracking-wider">{room.name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{room.owner_email === user.email ? 'Owner' : 'Member'}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {tab === 'invites' && (
                        <div className="space-y-3 px-3 py-4">
                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Active Invitations</h3>
                            {myInvites.length === 0 && <p className="text-[11px] text-slate-500 italic px-1">No pending invites</p>}
                            {myInvites.map(inv => (
                                <div key={inv.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-xl animate-in slide-in-from-right-2">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-500" /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-white uppercase truncate">{inv.rooms.name}</p>
                                            <p className="text-[9px] text-slate-500 truncate lowercase">{inv.inviter_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => respondInvite(inv, 'rejected')} className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter text-slate-400 bg-slate-800 hover:text-white transition-all">Decline</button>
                                        <button onClick={() => respondInvite(inv, 'accepted')} className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter text-white bg-blue-600 shadow-md">Accept</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Profile Footer */}
                <div className="p-4 border-t border-slate-800/40 bg-slate-900/40">
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                        <img src={currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-9 h-9 rounded-xl border border-white/10" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white truncate uppercase tracking-tight">{currentUserProfile?.full_name || 'Alumni'}</p>
                            <p className="text-[10px] text-slate-500 truncate lowercase">{user.email}</p>
                        </div>
                        <button onClick={() => authService.logout()} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative bg-slate-950">
                {selectedChat ? (
                    <ChatWindow chat={selectedChat} currentUserEmail={user.email} socket={socket} onInitiateCall={initiatePrivateCall} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 rounded-[2rem] bg-slate-900 border border-slate-800 flex items-center justify-center shadow-3xl">
                                <Shield className="w-10 h-10 text-blue-600/40" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20 border-4 border-slate-950">
                                <VideoIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Private Workspace</h3>
                        <p className="max-w-xs text-slate-500 text-sm font-medium leading-relaxed text-center">Your private sanctuary for focused study and high-secure meetings. Everything happens here, only by invitation.</p>
                    </div>
                )}
            </div>

            {/* Create Room Modal */}
            {showCreateRoom && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <form onSubmit={createRoom} className="w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(37,99,235,0.15)] animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Setup New Room</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Start a private workspace</p>
                            </div>
                            <button type="button" onClick={() => setShowCreateRoom(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-2 tracking-widest">Workspace Name</label>
                                <input required type="text" placeholder="e.g. Thesis Research" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-2 tracking-widest">Objective (Optional)</label>
                                <textarea rows="3" placeholder="Define the goal of this room..." className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium resize-none" value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })} />
                            </div>
                        </div>

                        <button type="submit" className="w-full mt-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            Initialize Workspace
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chat;
