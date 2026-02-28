const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    if (line.includes('=')) {
        const [k, v] = line.split('=');
        acc[k.trim()] = v.trim();
    }
    return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL || '';
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: accounts } = await supabase.from('accounts').select('id, name, initialBalance');
    if (!accounts) return;
    console.log(`Found ${accounts.length} accounts.`);

    const { data: txs } = await supabase.from('transactions').select('*');

    for (const acc of accounts) {
        const accTxs = txs?.filter(t => t.account_id === acc.id) || [];
        let sum = 0;
        accTxs.forEach(t => {
            if (t.type === 'INCOME') sum += t.amount;
            if (t.type === 'EXPENSE') sum -= t.amount;
            if (t.type === 'TRANSFER' && t.transfer_direction === 'IN') sum += t.amount;
            if (t.type === 'TRANSFER' && t.transfer_direction === 'OUT') sum -= t.amount;
        });

        if (sum !== 0 || acc.initialBalance !== 0 || acc.name.toLowerCase().includes('cred')) {
            console.log(`\nAccount: ${acc.name} (${acc.id})`);
            console.log(`  Initial Balance: ${acc.initialBalance}`);
            console.log(`  Transaction Sum: ${sum}`);
            console.log(`  Expected Dashboard: ${acc.initialBalance + sum}`);
        }
    }
}

check().catch(console.error);
