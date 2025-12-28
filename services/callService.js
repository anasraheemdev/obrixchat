import { supabase } from '../supabase';

export const callService = {
    // Log a new call
    async logCall(callerEmail, calleeEmail, callType, status) {
        const { data, error } = await supabase
            .from('call_logs')
            .insert([{
                caller_email: callerEmail,
                callee_email: calleeEmail,
                call_type: callType,
                status: status,
                started_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Error logging call:', error);
            return null;
        }
        return data;
    },

    // Update call when ended
    async endCall(callId, durationSeconds) {
        const { error } = await supabase
            .from('call_logs')
            .update({
                duration_seconds: durationSeconds,
                ended_at: new Date().toISOString()
            })
            .eq('id', callId);

        if (error) console.error('Error updating call:', error);
    },

    // Update call status (e.g., missed -> answered)
    async updateCallStatus(callId, status) {
        const { error } = await supabase
            .from('call_logs')
            .update({ status })
            .eq('id', callId);

        if (error) console.error('Error updating call status:', error);
    },

    // Get call history for a user
    async getCallHistory(email) {
        const { data, error } = await supabase
            .from('call_logs')
            .select('*')
            .or(`caller_email.eq.${email},callee_email.eq.${email}`)
            .order('started_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching call history:', error);
            return [];
        }
        return data;
    }
};
