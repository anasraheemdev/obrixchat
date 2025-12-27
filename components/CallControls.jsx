import { Phone, Video } from 'lucide-react';

const CallControls = ({ onInitiateCall, otherEmail }) => {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => onInitiateCall('audio')}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] text-slate-400 hover:text-white transition-all group relative"
                title="Voice Call"
            >
                <Phone className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
                onClick={() => onInitiateCall('video')}
                className="p-2.5 rounded-xl hover:bg-white/[0.05] text-slate-400 hover:text-white transition-all group relative"
                title="Video Call"
            >
                <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
        </div>
    );
};

export default CallControls;
