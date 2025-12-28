import { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { supabase } from '../supabase';
import MessageInput from './MessageInput';
import { Phone, Video, MoreVertical, Search, ArrowLeft } from 'lucide-react';

const ChatWindow = ({ chat, currentUserEmail, socket, onInitiateCall, currentUserProfile }) => {
    const [messages, setMessages] = useState([]);
    const [otherProfile, setOtherProfile] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const otherEmail = chat.user_1_email === currentUserEmail ? chat.user_2_email : chat.user_1_email;

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [msgs, { data: prof }] = await Promise.all([
                    chatService.getMessages(chat.id),
                    supabase.from('users').select('*').eq('email', otherEmail).single()
                ]);
                setMessages(msgs);
                setOtherProfile(prof);
                setTimeout(() => scrollToBottom(false), 100);
            } catch (err) {
                console.error('Error fetching chat data:', err);
            }
        };
        fetchData();

        socket?.emit('join_chat', chat.id);

        const handleReceiveMessage = (msg) => {
            if (msg.chat_id === chat.id) {
                setMessages(prev => [...prev, msg]);
                setTimeout(() => scrollToBottom(), 50);
            }
        };

        const handleTyping = (data) => {
            if (data.chat_id === chat.id && data.email !== currentUserEmail) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        };

        socket?.on('receive_message', handleReceiveMessage);
        socket?.on('user_typing', handleTyping);

        return () => {
            socket?.off('receive_message', handleReceiveMessage);
            socket?.off('user_typing', handleTyping);
        };
    }, [chat.id, otherEmail, socket, currentUserEmail]);

    const handleSendMessage = async (text) => {
        try {
            const msg = await chatService.saveMessage(chat.id, currentUserEmail, text);
            socket?.emit('send_message', msg);
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const handleTypingStatus = () => {
        socket?.emit('typing', { chat_id: chat.id, email: currentUserEmail });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between bg-[#202c33] border-b border-[#222d34]">
                <div className="flex items-center gap-3">
                    <img
                        src={otherProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherEmail}`}
                        alt={otherEmail}
                        className="w-10 h-10 rounded-full cursor-pointer"
                    />
                    <div>
                        <h3 className="text-[#e9edef] font-medium text-sm">
                            {otherProfile?.full_name || otherEmail.split('@')[0]}
                        </h3>
                        <p className="text-[#8696a0] text-xs">
                            {isTyping ? 'typing...' : 'online'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onInitiateCall('video', otherEmail, otherProfile?.full_name, otherProfile?.avatar_url)}
                        className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                    >
                        <Video className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onInitiateCall('audio', otherEmail, otherProfile?.full_name, otherProfile?.avatar_url)}
                        className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                    >
                        <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-16 py-4 space-y-1" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}>
                {messages.map((msg, index) => {
                    const isOwn = msg.sender_email === currentUserEmail;

                    return (
                        <div
                            key={msg.id || index}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`relative max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm ${isOwn
                                        ? 'bg-[#005c4b] text-[#e9edef]'
                                        : 'bg-[#202c33] text-[#e9edef]'
                                    }`}
                                style={{
                                    borderTopLeftRadius: isOwn ? '8px' : '0',
                                    borderTopRightRadius: isOwn ? '0' : '8px',
                                }}
                            >
                                {/* Message Tail */}
                                <div
                                    className={`absolute top-0 w-3 h-3 ${isOwn ? '-right-1.5' : '-left-1.5'}`}
                                    style={{
                                        background: isOwn ? '#005c4b' : '#202c33',
                                        clipPath: isOwn
                                            ? 'polygon(0 0, 100% 0, 0 100%)'
                                            : 'polygon(100% 0, 0 0, 100% 100%)'
                                    }}
                                ></div>

                                <p className="text-sm leading-relaxed pr-12">{msg.message_text}</p>

                                <div className="flex items-center justify-end gap-1 -mt-3">
                                    <span className="text-[10px] text-[#8696a0]">
                                        {formatTime(msg.created_at)}
                                    </span>
                                    {isOwn && (
                                        <svg viewBox="0 0 16 11" width="16" height="11" className="text-[#53bdeb]">
                                            <path fill="currentColor" d="M11.071 0L5.5 5.571 3.43 3.5 2 4.929l3.5 3.5 7-7z"></path>
                                            <path fill="currentColor" d="M14.071 0L8.5 5.571 7.429 4.5 6 5.929l2.5 2.5 7-7z"></path>
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-[#202c33] px-4 py-2">
                <MessageInput onSend={handleSendMessage} onTyping={handleTypingStatus} />
            </div>
        </div>
    );
};

export default ChatWindow;
