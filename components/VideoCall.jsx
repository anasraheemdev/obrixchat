import { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize } from 'lucide-react';

const VideoCall = ({ stream, remoteStream, onEndCall, isVideoCall }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(!isVideoCall);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => (track.enabled = isMuted));
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream && isVideoCall) {
            stream.getVideoTracks().forEach(track => (track.enabled = isVideoOff));
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className={`fixed inset-0 z-[110] bg-slate-950 flex flex-col items-center justify-center p-4 transition-all duration-500`}>
            {/* Remote Video (Full Background) */}
            <div className="relative w-full h-full max-w-6xl max-h-[85vh] rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/10 shadow-3xl group">
                {remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 animate-pulse">
                        <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center mb-6">
                            <Video className="w-12 h-12" />
                        </div>
                        <p className="text-xl font-black tracking-tight uppercase">Connecting Securely...</p>
                    </div>
                )}

                {/* Floating Local Video */}
                <div className="absolute top-6 right-6 w-32 sm:w-48 aspect-video sm:aspect-square md:w-64 md:aspect-video bg-slate-800 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 group-hover:scale-105 transition-transform duration-500">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover mirror"
                    />
                    {isVideoOff && (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                            <VideoOff className="w-8 h-8 text-slate-500" />
                        </div>
                    )}
                </div>

                {/* Overlay Controls */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-8 z-30">
                    <div className="glass px-6 py-4 rounded-[2rem] flex items-center gap-4 md:gap-6 shadow-2xl border-white/10">
                        <button
                            onClick={toggleMute}
                            className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={toggleVideo}
                            className={`p-4 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            disabled={!isVideoCall}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>

                        <button
                            onClick={onEndCall}
                            className="p-4 rounded-2xl bg-red-600 text-white hover:bg-red-500 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-red-900/40"
                        >
                            <PhoneOff className="w-6 h-6" />
                        </button>

                        <button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all hidden md:block"
                        >
                            {isFullScreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Remote Info Tag */}
                <div className="absolute top-6 left-6 z-30 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-white uppercase tracking-widest leading-none">Secure P2P Channel</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
