-- SCRIPT DE CORREÇÃO DEFINITIVA DE LOGIN (VINCULO DE ID)
-- Execute no Editor SQL do Supabase

DO $$
DECLARE
    v_email text := 'wweslianysantos@gmail.com';
    v_public_id uuid;
    v_password text := '956561';
BEGIN
    -- 1. Obter o ID "Real" que tem os dados (do perfil público)
    SELECT id INTO v_public_id FROM public.users WHERE email = v_email;

    IF v_public_id IS NULL THEN
        RAISE EXCEPTION 'Erro Crítico: Usuário não encontrado na tabela public.users. Verifique o email.';
    END IF;

    RAISE NOTICE 'ID do Perfil com dados: %', v_public_id;

    -- 2. Remover login antigo/desincronizado do Auth (se existir)
    -- Isso remove o usuário "técnico" que tinha o ID errado
    DELETE FROM auth.users WHERE email = v_email;

    RAISE NOTICE 'Usuário Auth antigo removido (se existia).';

    -- 3. Criar NOVO usuário Auth com o MESMO ID do perfil público
    -- Isso garante que auth.uid() == public.users.id
    INSERT INTO auth.users (
        instance_id,
        id, -- <--- AQUI ESTÁ O TRUQUE: Usamos o ID existente
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
        v_public_id, -- Forçando o ID correto
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

    RAISE NOTICE 'Novo Login Auth criado e VINCULADO com sucesso ao ID: %', v_public_id;
    RAISE NOTICE 'A senha é: %', v_password;

END $$;
