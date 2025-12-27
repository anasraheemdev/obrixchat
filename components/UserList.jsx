import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const UserList = ({ chats, onSelect, selectedChatId, currentUserEmail }) => {
    const [profiles, setProfiles] = useState({});

    useEffect(() => {
        // Fetch profiles for all unique users in chats
        const fetchProfiles = async () => {
            const emails = [...new Set(chats.flatMap(c => [c.user_1_email, c.user_2_email]))];
            const otherEmails = emails.filter(e => e !== currentUserEmail);

            if (otherEmails.length === 0) return;

            const { data, error } = await supabase
                .from('users')
                .select('email, full_name, avatar_url')
                .in('email', otherEmails);

            if (data) {
                const profileMap = data.reduce((acc, p) => ({ ...acc, [p.email]: p }), {});
                setProfiles(profileMap);
            }
        };

        fetchProfiles();
    }, [chats, currentUserEmail]);

    return (
        <div className="py-2">
            <div className="px-5 mb-4 mt-2">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-80">Conversations</h3>
            </div>
            {chats.length === 0 ? (
                <div className="px-6 py-8 text-center">
                    <p className="text-xs text-slate-600 font-medium italic">Your inbox is empty</p>
                </div>
            ) : (
                <div className="space-y-0.5">
                    {chats.map((chat) => {
                        const otherEmail = chat.user_1_email === currentUserEmail ? chat.user_2_email : chat.user_1_email;
                        const profile = profiles[otherEmail];
                        const isSelected = selectedChatId === chat.id;

                        return (
                            <button
                                key={chat.id}
                                onClick={() => onSelect(chat)}
                                className={`w-full px-4 py-3.5 flex items-center gap-3.5 transition-all relative group rounded-2xl mx-auto w-[92%] ${isSelected
                                        ? 'bg-blue-600/10 border border-blue-500/20 shadow-lg shadow-blue-500/5'
                                        : 'hover:bg-white/[0.03] border border-transparent'
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherEmail}`}
                                        alt={otherEmail}
                                        className={`w-11 h-11 rounded-xl object-cover bg-slate-800 transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-500/50 ring-offset-2 ring-offset-slate-900 border-transparent' : 'border border-white/10 group-hover:border-white/20'
                                            }`}
                                    />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h4 className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                                            {profile?.full_name || otherEmail.split('@')[0]}
                                        </h4>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                                            {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate font-medium flex items-center gap-1.5 leading-none">
                                        {profile ? otherEmail : 'Start chatting now'}
                                    </p>
                                </div>
                                {isSelected && (
                                    <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default UserList;
