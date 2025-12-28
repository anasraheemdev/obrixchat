import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const UserList = ({ chats, onSelect, selectedChatId, currentUserEmail }) => {
    const [profiles, setProfiles] = useState({});

    useEffect(() => {
        const fetchProfiles = async () => {
            const emails = chats.map(chat =>
                chat.user_1_email === currentUserEmail ? chat.user_2_email : chat.user_1_email
            );

            if (emails.length === 0) return;

            const { data } = await supabase
                .from('users')
                .select('email, full_name, avatar_url')
                .in('email', emails);

            if (data) {
                const profileMap = {};
                data.forEach(p => { profileMap[p.email] = p; });
                setProfiles(profileMap);
            }
        };
        fetchProfiles();
    }, [chats, currentUserEmail]);

    if (chats.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-[#8696a0] text-sm">No conversations yet</p>
                <p className="text-[#8696a0] text-xs mt-1">Search for a user to start chatting</p>
            </div>
        );
    }

    return (
        <div className="flex-1">
            {chats.map((chat) => {
                const otherEmail = chat.user_1_email === currentUserEmail ? chat.user_2_email : chat.user_1_email;
                const profile = profiles[otherEmail];
                const isSelected = selectedChatId === chat.id;

                return (
                    <div
                        key={chat.id}
                        onClick={() => onSelect(chat)}
                        className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-[#222d34] ${isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                            }`}
                    >
                        <img
                            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherEmail}`}
                            alt={otherEmail}
                            className="w-12 h-12 rounded-full"
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[#e9edef] font-medium text-base truncate">
                                    {profile?.full_name || otherEmail.split('@')[0]}
                                </h3>
                                <span className="text-[#8696a0] text-xs">
                                    {new Date(chat.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <p className="text-[#8696a0] text-sm truncate">
                                {otherEmail}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default UserList;
