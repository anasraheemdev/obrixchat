import { useRef, useEffect, useState } from 'react';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Monitor, Layout, Users, Shield,
    MessageCircle, Settings, Share2, UserMinus, Plus
} from 'lucide-react';

const MeetingRoom = ({
    room,
    currentUserEmail,
    localStream,
    remoteStreams,
    onEndCall,
    onToggleMic,
    onToggleVideo,
    onShareScreen,
    onKickMember,
    isMicMuted,
    isVideoOff,
    isScreenSharing
}) => {
    const localVideoRef = useRef(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const participants = Object.entries(remoteStreams);
    const isOwner = room.owner_email === currentUserEmail;

    return (
        <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="h-16 px-6 bg-slate-900/50 backdrop-blur-xl border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">{room.name}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Private Room • {isOwner ? 'Owner' : 'Member'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isOwner && (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> Invite
                        </button>
                    )}
                    <button className="p-2 text-slate-400 hover:text-white transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative p-6 grid gap-4 place-items-center">
                <div className={`h-full w-full max-w-7xl grid gap-4 ${participants.length === 0 ? 'grid-cols-1 max-w-2xl aspect-video' :
                        participants.length === 1 ? 'grid-cols-1 md:grid-cols-2' :
                            'grid-cols-2 md:grid-cols-3'
                    }`}>
                    <div className="relative rounded-3xl overflow-hidden bg-slate-800 border-2 border-white/10 shadow-2xl">
                        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isScreenSharing ? '' : 'mirror'}`} />
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">You {isMicMuted && '(Muted)'}</span>
                        </div>
                        {isVideoOff && (
                            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                                <VideoOff className="w-10 h-10 text-slate-700" />
                            </div>
                        )}
                    </div>

                    {participants.map(([socketId, data]) => (
                        <div key={socketId} className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/5 shadow-2xl group">
                            <RemoteVideo stream={data.stream} />
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest truncate">{data.userName || data.userEmail}</span>
                                {isOwner && (
                                    <button
                                        onClick={() => onKickMember(socketId, data.userEmail)}
                                        className="p-1 rounded-lg hover:bg-red-500 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <UserMinus className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Controls */}
            <div className="h-24 px-8 bg-slate-900/80 backdrop-blur-2xl border-t border-white/[0.05] flex items-center justify-center gap-4">
                <button onClick={onToggleMic} className={`p-4 rounded-2xl transition-all ${isMicMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                    {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={onToggleVideo} className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
                <button onClick={onShareScreen} className={`p-4 rounded-2xl transition-all ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                    <Monitor className="w-5 h-5" />
                </button>
                <button onClick={onEndCall} className="p-4 rounded-2xl bg-red-600 text-white hover:bg-red-500 shadow-xl shadow-red-900/30">
                    <PhoneOff className="w-5 h-5" />
                </button>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-3xl">
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Invite Participant</h3>
                        <p className="text-slate-500 text-xs mb-6 font-bold uppercase tracking-widest">Share access with another student</p>

                        <input
                            type="email"
                            placeholder="Student email address"
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500 mb-6 font-medium"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                        />

                        <div className="flex gap-3">
                            <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">Cancel</button>
                            <button
                                onClick={() => { /* Real logic moved to parent via handler if preferred, or direct service */ }}
                                className="flex-1 py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg"
                            >
                                Send Invitation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RemoteVideo = ({ stream }) => {
    const videoRef = useRef(null);
    useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
    return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
};

export default MeetingRoom;
