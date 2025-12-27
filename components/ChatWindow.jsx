import { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { supabase } from '../supabase';
import MessageInput from './MessageInput';
import CallControls from './CallControls';
import { MoreHorizontal, ShieldCheck, Clock } from 'lucide-react';

const ChatWindow = ({ chat, currentUserEmail, socket, onInitiateCall }) => {
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
                console.error('Error fetching chat window data:', err);
            }
        };
        fetchData();

        socket.emit('join_chat', chat.id);

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

        socket.on('receive_message', handleReceiveMessage);
        socket.on('user_typing', handleTyping);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('user_typing', handleTyping);
        };
    }, [chat.id, otherEmail, socket, currentUserEmail]);

    const handleSendMessage = async (text) => {
        try {
            const msg = await chatService.saveMessage(chat.id, currentUserEmail, text);
            socket.emit('send_message', msg);
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    const handleTypingStatus = () => {
        socket.emit('typing', { chat_id: chat.id, email: currentUserEmail });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950/20 relative z-10">
            {/* Header */}
            <div className="px-6 h-20 flex items-center justify-between border-b border-white/[0.05] bg-slate-900/40 backdrop-blur-3xl shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img
                            src={otherProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherEmail}`}
                            alt={otherEmail}
                            className="w-12 h-12 rounded-2xl object-cover bg-slate-800 border border-white/10"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-[3px] border-slate-900 rounded-full z-20"></span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-black tracking-tight">{otherProfile?.full_name || otherEmail.split('@')[0]}</h3>
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 leading-none mt-1">
                            {isTyping ? (
                                <span className="text-blue-400 lowercase animate-pulse italic">typing...</span>
                            ) : "Online"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Call Controls Integration */}
                    <CallControls onInitiateCall={onInitiateCall} otherEmail={otherEmail} />

                    <div className="w-[1px] h-6 bg-white/[0.05] mx-2"></div>
                    <button className="p-2.5 rounded-xl hover:bg-white/[0.05] text-slate-400 hover:text-white transition-all"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar scroll-smooth">
                {messages.map((msg, index) => {
                    const isOwn = msg.sender_email === currentUserEmail;
                    const showAvatar = index === 0 || messages[index - 1].sender_email !== msg.sender_email;

                    return (
                        <div key={msg.id || index} className={`flex items-end gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}>
                            {!isOwn && (
                                <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/5 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                    <img src={otherProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherEmail}`} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-3.5 rounded-3xl text-sm font-medium leading-relaxed transition-all duration-300 shadow-xl ${isOwn
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none'
                                        : 'bg-slate-800/80 backdrop-blur-md text-slate-100 rounded-bl-none border border-white/[0.05]'
                                    }`}>
                                    {msg.message_text}
                                </div>
                                <div className={`mt-2 flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-900/20 backdrop-blur-3xl border-t border-white/[0.05]">
                <MessageInput onSend={handleSendMessage} onTyping={handleTypingStatus} />
            </div>
        </div>
    );
};

export default ChatWindow;
