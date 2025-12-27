import { Phone, PhoneOff } from 'lucide-react';

const IncomingCall = ({ callData, onAccept, onReject }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-sm glass rounded-3xl p-8 text-center shadow-2xl border border-white/10 relative overflow-hidden">
                {/* Animated Background Pulse */}
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <div className="w-40 h-40 bg-blue-500/20 rounded-full animate-ping opacity-20"></div>
                </div>

                <div className="relative z-10">
                    <div className="relative inline-block mb-6">
                        <img
                            src={callData.callerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callData.from}`}
                            alt="Caller"
                            className="w-24 h-24 rounded-3xl object-cover bg-slate-800 border-2 border-blue-500/50"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl shadow-lg animate-bounce">
                            <Phone className="w-4 h-4 text-white" />
                        </div>
                    </div>

                    <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">
                        Incoming {callData.type === 'video' ? 'Video' : 'Voice'} Call
                    </h3>
                    <p className="text-slate-400 font-bold text-sm mb-8 tracking-wide">
                        {callData.callerName || callData.from}
                    </p>

                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={onReject}
                            className="w-14 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all flex items-center justify-center group"
                        >
                            <PhoneOff className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={onAccept}
                            className="w-14 h-14 rounded-2xl bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 transition-all flex items-center justify-center group shadow-xl shadow-green-500/20"
                        >
                            <Phone className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncomingCall;
