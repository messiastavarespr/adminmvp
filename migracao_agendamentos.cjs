const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrarTransacoes() {
    const userId = "2adbac24-cb69-4996-bb26-62380091200e";
    const userDisplayName = "Messias Tavares";

    console.log("Iniciando migração de transações legadas...");

    // 1. Buscar transações que pertencem ao Messias mas estão com nome ou sem ID correto
    const { data: txs, error } = await supabase
        .from('transactions')
        .select('id, description, date, created_by')
        .or(`created_by.eq."${userDisplayName}",created_by.is.null`);

    if (error) {
        console.error("Erro ao buscar transações:", error);
        return;
    }

    console.log(`Encontradas ${txs.length} transações para corrigir.`);

    for (const tx of txs) {
        // Normalizar data para ter 12:00:00 se não tiver
        const baseDate = tx.date.split(' ')[0];
        const normalizedDate = `${baseDate} 12:00:00`;

        const { error: updateError } = await supabase
            .from('transactions')
            .update({ 
                created_by: userId,
                date: normalizedDate 
            })
            .eq('id', tx.id);

        if (updateError) {
            console.error(`Erro ao atualizar transação ${tx.id}:`, updateError);
        } else {
            console.log(`✓ Atualizada: ${tx.description} (${baseDate})`);
        }
    }

    console.log("\nMigração concluída com sucesso!");
}

migrarTransacoes();
