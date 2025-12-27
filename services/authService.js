import { supabase } from '../supabase';

export const authService = {
    async signup(email, password, fullName, avatarUrl) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                }
            }
        });

        if (error) throw error;

        // The trigger handle_new_user should ideally handle the public.users table placement,
        // but we can also do it manually if the trigger isn't set up yet.
        if (data.user) {
            await supabase.from('users').upsert([
                {
                    id: data.user.id,
                    email,
                    full_name: fullName,
                    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
                }
            ]);
        }

        return data;
    },

    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async searchUser(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async getCurrentUserProfile(id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }
};
