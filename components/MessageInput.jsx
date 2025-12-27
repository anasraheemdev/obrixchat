import { useState } from 'react';
import { Send, Plus, Smile, Image, Mic } from 'lucide-react';

const MessageInput = ({ onSend, onTyping }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text);
            setText('');
        }
    };

    const handleChange = (e) => {
        setText(e.target.value);
        if (onTyping) onTyping();
    };

    return (
        <form onSubmit={handleSubmit} className="relative group">
            <div className="flex items-center gap-2 bg-slate-800/40 border border-white/[0.05] rounded-[2rem] p-2 pl-6 focus-within:bg-slate-800/60 focus-within:border-blue-500/30 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all duration-300 shadow-2xl">
                <button type="button" className="p-2 -ml-2 text-slate-500 hover:text-white transition-colors">
                    <Plus className="w-5 h-5" />
                </button>

                <input
                    type="text"
                    placeholder="Craft your message..."
                    className="flex-1 bg-transparent py-3 text-sm text-slate-100 focus:outline-none placeholder:text-slate-600 font-medium"
                    value={text}
                    onChange={handleChange}
                />

                <div className="flex items-center gap-1 pr-2">
                    <button type="button" className="p-2.5 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/[0.05]">
                        <Smile className="w-5 h-5" />
                    </button>
                    <button type="button" className="p-2.5 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/[0.05]">
                        <Image className="w-5 h-5" />
                    </button>
                    <button type="button" className="p-2.5 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/[0.05]">
                        <Mic className="w-5 h-5" />
                    </button>
                    <button
                        type="submit"
                        disabled={!text.trim()}
                        className="bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 ml-2 p-3 rounded-full text-white transition-all duration-300 shadow-lg shadow-blue-600/20"
                    >
                        <Send className="w-5 h-5 fill-current" />
                    </button>
                </div>
            </div>
        </form>
    );
};

export default MessageInput;
