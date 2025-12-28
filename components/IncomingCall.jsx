import { Phone, PhoneOff, Video, User } from 'lucide-react';

const IncomingCall = ({ callData, onAccept, onReject }) => {
    const { from, callerName, callerAvatar, type } = callData;

    return (
        <div className="fixed inset-0 z-[200] bg-[#0b141a] flex flex-col items-center justify-between py-16 animate-in fade-in duration-300">
            {/* Top Section */}
            <div className="text-center">
                <p className="text-[#00a884] text-sm font-medium mb-2 uppercase tracking-wider">
                    {type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'}
                </p>
            </div>

            {/* Center - Avatar & Name */}
            <div className="flex flex-col items-center">
                {/* Pulsing Ring Animation */}
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-[#00a884]/20 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-[-8px] rounded-full border-4 border-[#00a884]/30 animate-pulse"></div>
                    <img
                        src={callerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${from}`}
                        alt={from}
                        className="w-32 h-32 rounded-full relative z-10 border-4 border-[#00a884]/50"
                    />
                </div>

                <h2 className="text-white text-2xl font-bold mt-8">
                    {callerName || from?.split('@')[0]}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{from}</p>

                {/* Ringing Animation Dots */}
                <div className="flex gap-1 mt-6">
                    <div className="w-2 h-2 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>

            {/* Bottom - Accept/Reject Buttons */}
            <div className="flex items-center justify-center gap-16">
                {/* Reject Button */}
                <button
                    onClick={onReject}
                    className="group flex flex-col items-center gap-2"
                >
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:bg-red-400 group-active:scale-95 transition-all">
                        <PhoneOff className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-gray-400 text-sm">Decline</span>
                </button>

                {/* Accept Button */}
                <button
                    onClick={onAccept}
                    className="group flex flex-col items-center gap-2"
                >
                    <div className="w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg shadow-[#00a884]/30 group-hover:bg-[#00a884]/90 group-active:scale-95 transition-all animate-pulse">
                        {type === 'video' ? (
                            <Video className="w-7 h-7 text-white" />
                        ) : (
                            <Phone className="w-7 h-7 text-white" />
                        )}
                    </div>
                    <span className="text-gray-400 text-sm">Accept</span>
                </button>
            </div>
        </div>
    );
};

export default IncomingCall;
