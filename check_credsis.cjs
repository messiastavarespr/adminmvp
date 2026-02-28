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
    const { data: accounts } = await supabase.from('accounts').select('id, name');
    const credsis = accounts?.find(a => a.name.toLowerCase().includes('credsis') || a.name.toLowerCase().includes('cred sis'));

    if (!credsis) {
        console.log('Account CredSIS not found. Available accounts:', accounts?.map(a => a.name).join(', '));
        return;
    }

    console.log(`\nAnalyzing Account: ${credsis.name} (${credsis.id})`);

    const { data: txs } = await supabase.from('transactions').select('id, description, amount, type, date, transfer_direction').eq('account_id', credsis.id).order('date', { ascending: false });

    if (!txs || txs.length === 0) {
        console.log('No transactions found for this account.');
        return;
    }

    console.log(`Found ${txs.length} transactions:\n`);

    let total = 0;
    txs.forEach(t => {
        let impact = 0;
        if (t.type === 'INCOME') impact = t.amount;
        else if (t.type === 'EXPENSE') impact = -t.amount;
        else if (t.type === 'TRANSFER') {
            impact = t.transfer_direction === 'IN' ? t.amount : -t.amount;
        }

        total += impact;
        const formattedDate = new Date(t.date).toLocaleDateString('pt-BR');
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(impact);

        console.log(`[${formattedDate}] ${t.type.padEnd(8)} | ${formattedAmount.padStart(12)} | ${t.description}`);
    });

    console.log(`\n========================================`);
    console.log(`TOTAL NET BALANCE: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`);
}

check().catch(console.error);
