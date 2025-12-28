import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { roomService } from '../services/roomService';
import { callService } from '../services/callService';
import UserList from '../components/UserList';
import ChatWindow from '../components/ChatWindow';
import IncomingCall from '../components/IncomingCall';
import MeetingRoom from '../components/MeetingRoom';
import CallHistory from '../components/CallHistory';
import {
    LogOut, MessageSquare, Search, Phone,
    Users, MoreVertical, Camera
} from 'lucide-react';
import io from 'socket.io-client';

let socket;

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

const Chat = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [callLogs, setCallLogs] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchError, setSearchError] = useState('');
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [tab, setTab] = useState('chats'); // 'chats', 'calls'
    const [socketConnected, setSocketConnected] = useState(false);

    // Calling States
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null); // { roomId, type, otherEmail, otherName, otherAvatar, callLogId }
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [peers, setPeers] = useState({});
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const localStreamRef = useRef(null);
    const peersRef = useRef({});

    // Keep refs in sync
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        peersRef.current = peers;
    }, [peers]);

    // Socket Connection
    useEffect(() => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || undefined;
        console.log('Connecting to backend:', backendUrl || 'same-origin');

        socket = io(backendUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);
            setSocketConnected(true);
            socket.emit('identify', user.email);
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            setSocketConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        // Incoming call
        socket.on('incoming-call', async (data) => {
            console.log('📞 Incoming call from:', data.from);
            // Log missed call (will update if answered)
            const callLog = await callService.logCall(data.from, user.email, data.type, 'missed');
            setIncomingCall({ ...data, callLogId: callLog?.id });
        });

        // Call rejected
        socket.on('call-rejected', () => {
            console.log('Call was rejected');
            cleanupCall();
            alert('Call was rejected');
        });

        // User joined room (for WebRTC)
        socket.on('user-joined', async ({ socketId, userEmail, userName, userAvatar }) => {
            console.log('👤 User joined:', userEmail, 'socketId:', socketId);
            await createPeerConnection(socketId, userEmail, userName, userAvatar, true);
        });

        // WebRTC signaling
        socket.on('webrtc-signal', async ({ from, fromEmail, signal }) => {
            console.log('📡 WebRTC signal from:', from, 'type:', signal.type || 'candidate');

            if (signal.type === 'offer') {
                await handleOffer(from, fromEmail, signal);
            } else if (signal.type === 'answer') {
                const pc = peersRef.current[from];
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                }
            } else if (signal.candidate) {
                const pc = peersRef.current[from];
                if (pc && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal));
                }
            }
        });

        // User left
        socket.on('user-left', (socketId) => {
            console.log('👤 User left:', socketId);
            const pc = peersRef.current[socketId];
            if (pc) {
                pc.close();
                setPeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
                setRemoteStreams(prev => { const n = { ...prev }; delete n[socketId]; return n; });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user.email]);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [chatData, profileData, callData] = await Promise.all([
                    chatService.getChats(user.email),
                    authService.getCurrentUserProfile(user.id),
                    callService.getCallHistory(user.email)
                ]);
                setChats(chatData);
                setCurrentUserProfile(profileData);
                setCallLogs(callData);
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [user.email, user.id]);

    // WebRTC: Create Peer Connection
    const createPeerConnection = async (targetSocketId, email, name, avatar, isInitiator) => {
        console.log('🔗 Creating peer connection to:', targetSocketId, 'isInitiator:', isInitiator);

        const pc = new RTCPeerConnection(ICE_SERVERS);

        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind);
                pc.addTrack(track, stream);
            });
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit('webrtc-signal', {
                    to: targetSocketId,
                    from: user.email,
                    signal: e.candidate
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
        };

        pc.ontrack = (e) => {
            console.log('🎥 Received remote track:', e.track.kind);
            setRemoteStreams(prev => ({
                ...prev,
                [targetSocketId]: { stream: e.streams[0], userEmail: email, userName: name, userAvatar: avatar }
            }));
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc-signal', {
                to: targetSocketId,
                from: user.email,
                signal: offer
            });
        }

        setPeers(prev => ({ ...prev, [targetSocketId]: pc }));
        peersRef.current[targetSocketId] = pc;
        return pc;
    };

    // WebRTC: Handle incoming offer
    const handleOffer = async (fromSocketId, fromEmail, offer) => {
        console.log('📥 Handling offer from:', fromSocketId);

        const pc = new RTCPeerConnection(ICE_SERVERS);

        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.emit('webrtc-signal', {
                    to: fromSocketId,
                    from: user.email,
                    signal: e.candidate
                });
            }
        };

        pc.ontrack = (e) => {
            console.log('🎥 Received remote track from offer:', e.track.kind);
            setRemoteStreams(prev => ({
                ...prev,
                [fromSocketId]: { stream: e.streams[0], userEmail: fromEmail, userName: '', userAvatar: '' }
            }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-signal', {
            to: fromSocketId,
            from: user.email,
            signal: answer
        });

        setPeers(prev => ({ ...prev, [fromSocketId]: pc }));
        peersRef.current[fromSocketId] = pc;
    };

    // Initiate a call
    const initiateCall = async (type, otherEmail, otherName, otherAvatar) => {
        console.log('📞 Initiating', type, 'call to:', otherEmail);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            setLocalStream(stream);
            localStreamRef.current = stream;

            const roomId = `call_${[user.email, otherEmail].sort().join('_')}_${Date.now()}`;

            // Log outgoing call
            const callLog = await callService.logCall(user.email, otherEmail, type, 'outgoing');

            setActiveCall({
                roomId,
                type,
                otherEmail,
                otherName,
                otherAvatar,
                callLogId: callLog?.id
            });

            // Join the room first
            socket.emit('join-room', {
                roomId,
                userEmail: user.email,
                userName: currentUserProfile?.full_name || user.email.split('@')[0],
                userAvatar: currentUserProfile?.avatar_url
            });

            // Then notify the other user
            socket.emit('call-user', {
                to: otherEmail,
                from: user.email,
                type,
                roomId,
                callerName: currentUserProfile?.full_name,
                callerAvatar: currentUserProfile?.avatar_url
            });

        } catch (err) {
            console.error('Media access error:', err);
            alert('Camera/Microphone access required for calls');
        }
    };

    // Accept incoming call
    const acceptCall = async () => {
        if (!incomingCall) return;
        console.log('✅ Accepting call from:', incomingCall.from);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: incomingCall.type === 'video',
                audio: true
            });
            setLocalStream(stream);
            localStreamRef.current = stream;

            // Update call log to answered
            if (incomingCall.callLogId) {
                await callService.updateCallStatus(incomingCall.callLogId, 'answered');
            }

            setActiveCall({
                roomId: incomingCall.roomId,
                type: incomingCall.type,
                otherEmail: incomingCall.from,
                otherName: incomingCall.callerName,
                otherAvatar: incomingCall.callerAvatar,
                callLogId: incomingCall.callLogId
            });

            socket.emit('join-room', {
                roomId: incomingCall.roomId,
                userEmail: user.email,
                userName: currentUserProfile?.full_name || user.email.split('@')[0],
                userAvatar: currentUserProfile?.avatar_url
            });

            setIncomingCall(null);
        } catch (err) {
            console.error('Media access error:', err);
            alert('Camera/Microphone access required');
        }
    };

    // Reject incoming call
    const rejectCall = () => {
        socket.emit('reject-call', { to: incomingCall.from, from: user.email });
        setIncomingCall(null);
    };

    // End call
    const endCall = () => {
        console.log('📴 Ending call');
        if (activeCall?.roomId) {
            socket.emit('leave-room', activeCall.roomId);
        }
        cleanupCall();
        refreshCallLogs();
    };

    // Cleanup call resources
    const cleanupCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
        }
        Object.values(peersRef.current).forEach(pc => pc.close());
        setPeers({});
        peersRef.current = {};
        setRemoteStreams({});
        setLocalStream(null);
        localStreamRef.current = null;
        setActiveCall(null);
        setIncomingCall(null);
    };

    // Refresh call logs
    const refreshCallLogs = async () => {
        const logs = await callService.getCallHistory(user.email);
        setCallLogs(logs);
    };

    // Toggle mute
    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = isMicMuted;
                setIsMicMuted(!isMicMuted);
            }
        }
    };

    // Toggle video
    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = isVideoOff;
                setIsVideoOff(!isVideoOff);
            }
        }
    };

    // Search handler
    const handleSearch = async (e) => {
        e.preventDefault();
        setSearchError('');
        if (!searchEmail.trim()) return;

        try {
            const foundUser = await authService.searchUser(searchEmail.toLowerCase());
            if (foundUser) {
                const chat = await chatService.createChat(user.email, foundUser.email);
                setChats(prev => [chat, ...prev.filter(c => c.id !== chat.id)]);
                setSelectedChat(chat);
                setSearchEmail('');
            } else {
                setSearchError('User not found');
            }
        } catch (err) {
            setSearchError('Error searching');
        }
    };

    // Call back from history
    const handleCallBack = (email, type) => {
        initiateCall(type, email, email.split('@')[0], null);
    };

    return (
        <div className="flex h-screen bg-[#111b21] text-white overflow-hidden font-sans">
            {/* Incoming Call Modal */}
            {incomingCall && (
                <IncomingCall
                    callData={incomingCall}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                />
            )}

            {/* Active Call Screen */}
            {activeCall && (
                <MeetingRoom
                    room={activeCall}
                    currentUserEmail={user.email}
                    otherUserName={activeCall.otherName}
                    otherUserAvatar={activeCall.otherAvatar}
                    localStream={localStream}
                    remoteStreams={remoteStreams}
                    onEndCall={endCall}
                    onToggleMic={toggleMic}
                    onToggleVideo={toggleVideo}
                    isMicMuted={isMicMuted}
                    isVideoOff={isVideoOff}
                    callType={activeCall.type}
                />
            )}

            {/* Sidebar */}
            <div className="w-[400px] border-r border-[#222d34] flex flex-col bg-[#111b21]">
                {/* Header */}
                <div className="h-14 px-4 flex items-center justify-between bg-[#202c33]">
                    <div className="flex items-center gap-3">
                        <img
                            src={currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                            alt="Profile"
                            className="w-10 h-10 rounded-full cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Connection Status */}
                        <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} title={socketConnected ? 'Connected' : 'Disconnected'}></div>
                        <button className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full">
                            <Camera className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-2 bg-[#111b21]">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
                        <input
                            type="email"
                            placeholder="Search or start new chat"
                            className="w-full bg-[#202c33] border-none rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#8696a0] focus:outline-none"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                        />
                    </form>
                    {searchError && <p className="text-red-400 text-xs mt-1 px-2">{searchError}</p>}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#222d34]">
                    <button
                        onClick={() => setTab('chats')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'chats'
                                ? 'text-[#00a884] border-b-2 border-[#00a884]'
                                : 'text-[#8696a0] hover:text-white'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4 inline mr-2" />
                        Chats
                    </button>
                    <button
                        onClick={() => { setTab('calls'); refreshCallLogs(); }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'calls'
                                ? 'text-[#00a884] border-b-2 border-[#00a884]'
                                : 'text-[#8696a0] hover:text-white'
                            }`}
                    >
                        <Phone className="w-4 h-4 inline mr-2" />
                        Calls
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {tab === 'chats' && (
                        <UserList
                            chats={chats}
                            onSelect={setSelectedChat}
                            selectedChatId={selectedChat?.id}
                            currentUserEmail={user.email}
                        />
                    )}

                    {tab === 'calls' && (
                        <CallHistory
                            calls={callLogs}
                            currentUserEmail={user.email}
                            onCallBack={handleCallBack}
                        />
                    )}
                </div>

                {/* Profile Footer */}
                <div className="p-3 border-t border-[#222d34] bg-[#202c33]">
                    <div className="flex items-center gap-3">
                        <img
                            src={currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                            className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {currentUserProfile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-[#8696a0] truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={() => authService.logout()}
                            className="p-2 text-[#8696a0] hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0b141a]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}>
                {selectedChat ? (
                    <ChatWindow
                        chat={selectedChat}
                        currentUserEmail={user.email}
                        socket={socket}
                        onInitiateCall={initiateCall}
                        currentUserProfile={currentUserProfile}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                        <div className="w-60 h-60 mb-6 opacity-50">
                            <svg viewBox="0 0 303 172" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M151.5 0C68.1 0 0 66.8 0 149.3v22.7h303v-22.7C303 66.8 234.9 0 151.5 0z" fill="#364147" />
                                <circle cx="151.5" cy="86" r="60" fill="#00a884" />
                                <path d="M130 76l30 20-30 20V76z" fill="white" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-light text-[#e9edef] mb-2">ObrixChat Web</h3>
                        <p className="text-[#8696a0] text-sm max-w-sm">
                            Send and receive messages without keeping your phone online.
                            <br />Use ObrixChat on up to 4 linked devices at once.
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-[#8696a0] text-xs">
                            <span className="w-4 h-4 rounded-full border border-[#8696a0] flex items-center justify-center">🔒</span>
                            End-to-end encrypted
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
