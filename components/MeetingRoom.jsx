import { useRef, useEffect, useState } from 'react';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Volume2, FlipHorizontal, MoreVertical
} from 'lucide-react';

const MeetingRoom = ({
    room,
    currentUserEmail,
    otherUserName,
    otherUserAvatar,
    localStream,
    remoteStreams,
    onEndCall,
    onToggleMic,
    onToggleVideo,
    isMicMuted,
    isVideoOff,
    callType
}) => {
    const localVideoRef = useRef(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Call duration timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const participants = Object.entries(remoteStreams);
    const hasRemoteVideo = participants.length > 0 && participants[0][1]?.stream;

    return (
        <div className="fixed inset-0 z-[150] bg-[#0b141a] flex flex-col overflow-hidden">
            {/* Main Video Area */}
            <div className="flex-1 relative">
                {/* Remote Video (Full Screen) */}
                {hasRemoteVideo ? (
                    <RemoteVideo
                        stream={participants[0][1].stream}
                        name={otherUserName}
                        avatar={otherUserAvatar}
                    />
                ) : (
                    /* Audio Call or Waiting for Video */
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0b141a] to-[#1f2c34]">
                        <img
                            src={otherUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room?.name || 'user'}`}
                            alt="User"
                            className="w-32 h-32 rounded-full border-4 border-[#00a884]/30 mb-6"
                        />
                        <h2 className="text-white text-xl font-semibold">{otherUserName || room?.name}</h2>
                        <p className="text-[#00a884] text-sm mt-2">{formatDuration(callDuration)}</p>
                    </div>
                )}

                {/* Local Video Preview (Floating) */}
                {callType === 'video' && !isVideoOff && (
                    <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-[#00a884]/30 z-20">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover mirror"
                        />
                    </div>
                )}

                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <p className="text-white font-medium text-sm">{otherUserName || room?.name}</p>
                            <p className="text-gray-300 text-xs">{formatDuration(callDuration)}</p>
                        </div>
                    </div>
                    <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-[#1f2c34] px-6 py-8">
                <div className="flex items-center justify-center gap-6">
                    {/* Speaker Toggle */}
                    <button
                        onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-[#2a3942] text-white' : 'bg-white/10 text-gray-400'
                            }`}
                    >
                        <Volume2 className="w-6 h-6" />
                    </button>

                    {/* Video Toggle */}
                    {callType === 'video' && (
                        <button
                            onClick={onToggleVideo}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-white text-[#0b141a]' : 'bg-[#2a3942] text-white'
                                }`}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                    )}

                    {/* Mute Toggle */}
                    <button
                        onClick={onToggleMic}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMicMuted ? 'bg-white text-[#0b141a]' : 'bg-[#2a3942] text-white'
                            }`}
                    >
                        {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* End Call */}
                    <button
                        onClick={onEndCall}
                        className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 active:scale-95 transition-all shadow-lg shadow-red-500/30"
                    >
                        <PhoneOff className="w-6 h-6 text-white" />
                    </button>

                    {/* Flip Camera */}
                    {callType === 'video' && (
                        <button className="w-14 h-14 rounded-full bg-[#2a3942] flex items-center justify-center text-white">
                            <FlipHorizontal className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const RemoteVideo = ({ stream, name, avatar }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
        />
    );
};

export default MeetingRoom;
