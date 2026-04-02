const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ziajkrvqlmjrrrhuswzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppYWprcnZxbG1qcnJyaHVzd3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODc2ODQsImV4cCI6MjA4MDk2MzY4NH0.AclCg6OkTPyXOEFs2N_hl_f9bfZKq78PK4YVYaa46tQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostico() {
    const { data: churches } = await supabase.from('churches').select('id, name');
    console.log('--- IGREJAS ---');
    console.log(JSON.stringify(churches, null, 2));

    const sede = churches?.find(c => c.name.includes('Sede'));
    const sedeId = sede ? sede.id : null;

    console.log(`\n--- TRANSACOES COM AGENDAMENTOS (Sede ID: ${sedeId}) ---`);
    const { data: txs, error } = await supabase
        .from('transactions')
        .select('id, description, amount, date, church_id, scheduled_id, is_paid, fund_id, account_id, type, created_by')
        .not('scheduled_id', 'is', null)
        .order('date', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(JSON.stringify(txs, null, 2));
}

diagnostico();
