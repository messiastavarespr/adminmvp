import { supabase } from './supabaseClient';
import { SystemWarning, WarningRead } from '../types';

export const warningService = {
    // Fetch all active warnings
    async fetchActiveWarnings(): Promise<SystemWarning[]> {
        const { data, error } = await supabase
            .from('system_warnings')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching system warnings:', error);
            throw error;
        }
        return data || [];
    },

    // Fetch IDs of warnings read by the specific user
    async fetchUserReadWarnings(userId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('warning_reads')
            .select('warning_id')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching user read warnings:', error);
            throw error;
        }
        return data ? data.map((r: { warning_id: string }) => r.warning_id) : [];
    },

    // Mark a warning as read for a user
    async markWarningAsRead(warningId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('warning_reads')
            .insert([
                { warning_id: warningId, user_id: userId }
            ]);

        if (error) {
            // Ignore duplicate key error if user already clicked/read multiple times quickly
            if (error.code !== '23505') {
                console.error('Error marking warning as read:', error);
                throw error;
            }
        }
    },

    // Create a new warning (Admin only)
    async createWarning(title: string, message: string, userId: string): Promise<SystemWarning> {
        const { data, error } = await supabase
            .from('system_warnings')
            .insert([
                { title, message, created_by: userId, active: true }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating warning:', error);
            throw error;
        }
        return data;
    },

    // Deactivate a warning (Soft delete)
    async deactivateWarning(warningId: string): Promise<void> {
        const { error } = await supabase
            .from('system_warnings')
            .update({ active: false })
            .eq('id', warningId);

        if (error) {
            console.error('Error deactivating warning:', error);
            throw error;
        }
    }
};
