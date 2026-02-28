import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: accounts } = await supabase.from('accounts').select('id, name, initialBalance');
    const credsis = accounts?.find(a => a.name.toLowerCase().includes('credsis'));
    if (!credsis) {
        console.log('CredSIS not found');
        return;
    }
    console.log('CredSIS account:', credsis);

    const { data: txs } = await supabase.from('transactions').select('*').eq('account_id', credsis.id);
    console.log(`Found ${txs?.length} transactions for CredSIS`);

    let sum = 0;
    txs?.forEach(t => {
        if (t.type === 'INCOME') sum += t.amount;
        if (t.type === 'EXPENSE') sum -= t.amount;
        if (t.type === 'TRANSFER' && t.transfer_direction === 'IN') sum += t.amount;
        if (t.type === 'TRANSFER' && t.transfer_direction === 'OUT') sum -= t.amount;
        console.log(`- ${t.date} | ${t.type} | ${t.amount} | ${t.description}`);
    });

    console.log(`Net transaction sum: ${sum}`);
    console.log(`Expected Dashboard Balance: ${credsis.initialBalance + sum}`);
}

check().catch(console.error);
