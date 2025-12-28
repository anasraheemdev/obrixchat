import { useState } from 'react';
import { Smile, Paperclip, Mic, Send } from 'lucide-react';

const MessageInput = ({ onSend, onTyping }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSend(message.trim());
            setMessage('');
        }
    };

    const handleChange = (e) => {
        setMessage(e.target.value);
        onTyping?.();
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <button
                type="button"
                className="p-2 text-[#8696a0] hover:text-white transition-colors"
            >
                <Smile className="w-6 h-6" />
            </button>

            <button
                type="button"
                className="p-2 text-[#8696a0] hover:text-white transition-colors"
            >
                <Paperclip className="w-6 h-6" />
            </button>

            <input
                type="text"
                value={message}
                onChange={handleChange}
                placeholder="Type a message"
                className="flex-1 bg-[#2a3942] text-[#e9edef] text-sm rounded-lg py-2.5 px-4 focus:outline-none placeholder:text-[#8696a0]"
            />

            {message.trim() ? (
                <button
                    type="submit"
                    className="p-2 text-[#8696a0] hover:text-[#00a884] transition-colors"
                >
                    <Send className="w-6 h-6" />
                </button>
            ) : (
                <button
                    type="button"
                    className="p-2 text-[#8696a0] hover:text-white transition-colors"
                >
                    <Mic className="w-6 h-6" />
                </button>
            )}
        </form>
    );
};

export default MessageInput;
