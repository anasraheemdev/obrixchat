import {
    Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video


} from 'lucide-react';

const CallHistory = ({ calls, currentUserEmail, onCallBack }) => {
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallIcon = (call) => {
        const isOutgoing = call.caller_email === currentUserEmail;

        if (call.status === 'missed') {
            return <PhoneMissed className="w-4 h-4 text-red-500" />;
        } else if (call.status === 'rejected') {
            return <PhoneMissed className="w-4 h-4 text-red-500" />;
        } else if (isOutgoing) {
            return <PhoneOutgoing className="w-4 h-4 text-green-500" />;
        } else {
            return <PhoneIncoming className="w-4 h-4 text-green-500" />;
        }
    };

    const getOtherUser = (call) => {
        return call.caller_email === currentUserEmail ? call.callee_email : call.caller_email;
    };

    if (calls.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-4">
                    <Phone className="w-8 h-8 text-[#00a884]" />
                </div>
                <p className="text-white font-medium mb-1">No recent calls</p>
                <p className="text-gray-500 text-sm">Start a call from a chat</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {calls.map((call) => {
                const otherEmail = getOtherUser(call);
                const isMissed = call.status === 'missed' || call.status === 'rejected';

                return (
                    <div
                        key={call.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] cursor-pointer transition-colors border-b border-[#222d34]"
                        onClick={() => onCallBack(otherEmail, call.call_type)}
                    >
                        {/* Avatar */}
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${otherEmail}`}
                            alt={otherEmail}
                            className="w-12 h-12 rounded-full"
                        />

                        {/* Call Info */}
                        <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isMissed ? 'text-red-400' : 'text-white'}`}>
                                {otherEmail.split('@')[0]}
                            </p>
                            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                                {getCallIcon(call)}
                                <span>{formatTime(call.started_at)}</span>
                                {call.duration_seconds > 0 && (
                                    <span className="text-gray-500">• {formatDuration(call.duration_seconds)}</span>
                                )}
                            </div>
                        </div>

                        {/* Call Type Icon */}
                        <button className="p-2 text-[#00a884] hover:bg-[#00a884]/10 rounded-full transition-colors">
                            {call.call_type === 'video' ? (
                                <Video className="w-5 h-5" />
                            ) : (
                                <Phone className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default CallHistory;
