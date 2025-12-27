import { supabase } from '../supabase';

export const roomService = {
    async createRoom(name, description, ownerEmail) {
        const { data, error } = await supabase
            .from('rooms')
            .insert([{ name, description, owner_email: ownerEmail, is_active: true }])
            .select()
            .single();

        if (error) throw error;

        // Owner is automatically a member
        await this.addMember(data.id, ownerEmail);

        return data;
    },

    async addMember(roomId, memberEmail) {
        const { data, error } = await supabase
            .from('room_members')
            .insert([{ room_id: roomId, member_email: memberEmail }])
            .select()
            .single();
        if (error && error.code !== '23505') throw error; // Ignore duplicate
        return data;
    },

    async sendInvite(roomId, inviterEmail, inviteeEmail) {
        const { data, error } = await supabase
            .from('room_invites')
            .insert([{ room_id: roomId, inviter_email: inviterEmail, invitee_email: inviteeEmail, status: 'pending' }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getMyInvites(email) {
        const { data, error } = await supabase
            .from('room_invites')
            .select('*, rooms(name)')
            .eq('invitee_email', email)
            .eq('status', 'pending');
        if (error) throw error;
        return data;
    },

    async respondToInvite(inviteId, status, roomId, email) {
        const { error } = await supabase
            .from('room_invites')
            .update({ status })
            .eq('id', inviteId);

        if (error) throw error;

        if (status === 'accepted') {
            await this.addMember(roomId, email);
        }
    },

    async getMyRooms(email) {
        const { data, error } = await supabase
            .from('room_members')
            .select('*, rooms(*)')
            .eq('member_email', email);
        if (error) throw error;
        return data.map(m => m.rooms).filter(r => r.is_active);
    },

    async getRoomMembers(roomId) {
        const { data, error } = await supabase
            .from('room_members')
            .select('member_email, users(full_name, avatar_url)')
            .eq('room_id', roomId);
        if (error) throw error;
        return data;
    },

    async removeMember(roomId, memberEmail) {
        const { error } = await supabase
            .from('room_members')
            .delete()
            .eq('room_id', roomId)
            .eq('member_email', memberEmail);
        if (error) throw error;
    },

    async closeRoom(roomId) {
        const { error } = await supabase
            .from('rooms')
            .update({ is_active: false })
            .eq('id', roomId);
        if (error) throw error;
    }
};
