-- SCRIPT DE CORREÇÃO COMPLETA (DADOS + LOGIN) - CORRIGIDO
-- Execute no Editor SQL do Supabase

DO $$
DECLARE
    v_email text := 'wweslianysantos@gmail.com';
    v_public_id uuid;
    v_password text := '956561';
BEGIN
    -- 1. CORRIGIR OS DADOS (Copiar o "email" que está no campo "nome" para o campo "email" verdadeiro)
    UPDATE public.users
    SET email = name
    WHERE email IS NULL AND name LIKE '%@%';

    RAISE NOTICE 'Dados corrigidos. Emails preenchidos.';

    -- 2. RECRIAR O LOGIN DA USUÁRIA
    -- Buscar o ID correto agora que o email foi preenchido
    SELECT id INTO v_public_id FROM public.users WHERE email = v_email;

    IF v_public_id IS NULL THEN
        RAISE EXCEPTION 'Ainda não encontrei o usuário % na tabela users. Algo deu errado no UPDATE.', v_email;
    END IF;

    RAISE NOTICE 'ID encontrado: %. Recriando login...', v_public_id;

    -- Limpar login quebrado antigo
    DELETE FROM auth.users WHERE email = v_email;

    -- Criar novo login vinculado ao ID correto
    INSERT INTO auth.users (
        instance_id,
        id, -- VINCULO IMPORTANTE DO ID PUBLICO
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_public_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    RAISE NOTICE 'SUCESSO! Login corrigido para %', v_email;
END $$;
