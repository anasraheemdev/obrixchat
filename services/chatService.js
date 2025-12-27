import { supabase } from '../supabase';

export const chatService = {
    async getChats(email) {
        const { data, error } = await supabase
            .from('chats')
            .select('*')
            .or(`user_1_email.eq.${email},user_2_email.eq.${email}`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getMessages(chatId) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    async createChat(user1Email, user2Email) {
        // Check if chat already exists
        const { data: existing } = await supabase
            .from('chats')
            .select('*')
            .or(`and(user_1_email.eq.${user1Email},user_2_email.eq.${user2Email}),and(user_1_email.eq.${user2Email},user_2_email.eq.${user1Email})`)
            .single();

        if (existing) return existing;

        const { data, error } = await supabase
            .from('chats')
            .insert([{ user_1_email: user1Email, user_2_email: user2Email }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async saveMessage(chatId, senderEmail, messageText) {
        const { data, error } = await supabase
            .from('messages')
            .insert([{ chat_id: chatId, sender_email: senderEmail, message_text: messageText }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
