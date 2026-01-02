-- Script para corrigir/criar o login da usuária wweslianysantos@gmail.com
-- Este script deve ser rodado no Editor SQL do Supabase

DO $$
DECLARE
    v_user_email text := 'wweslianysantos@gmail.com';
    v_password text := '956561'; -- Senha vista no print
    v_user_id uuid;
    v_church_id uuid; -- ID da igreja para garantir o vinculo correto
    v_existing_profile_id uuid;
BEGIN
    -- 1. Verificar se o perfil público existe e criar se não
    SELECT id, church_id INTO v_existing_profile_id, v_church_id FROM public.users WHERE email = v_user_email;
    
    IF v_existing_profile_id IS NULL THEN
        RAISE NOTICE 'Perfil público não encontrado. Você deve criar o usuário na tela de Gestão de Usuários primeiro.';
        -- Opcional: Criar aqui se quiser forçar, mas melhor respeitar o app
    ELSE
        RAISE NOTICE 'Perfil público encontrado: % (Igreja: %)', v_existing_profile_id, v_church_id;
    END IF;

    -- 2. Verificar se o usuário AUTH existe
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

    IF v_user_id IS NOT NULL THEN
        -- Atualizar senha se existir
        RAISE NOTICE 'Usuário Auth existe (ID: %). Atualizando senha...', v_user_id;
        UPDATE auth.users 
        SET encrypted_password = crypt(v_password, gen_salt('bf')),
            email_confirmed_at = now(),
            raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email']),
            confirmation_token = NULL,
            recovery_token = NULL
        WHERE id = v_user_id;
        
        -- Garantir que o ID do perfil público bate com o Auth ID (CRÍTICO)
        -- Se o app gera IDs aleatórios para public.users, precisamos sincronizar
        IF v_existing_profile_id <> v_user_id THEN
            RAISE NOTICE 'Sincronizando ID do perfil público para bater com Auth ID...';
            -- Devido a FKs, isso pode ser complexo. O ideal é o perfil publico ter o mesmo ID do Auth.
            -- Se o sistema usa public.users.id como FK em transactions, mudar é perigoso.
            -- O sistema atual parece gerar UUIDs aleatórios no front (addUser).
            -- Entao vamos atualizar o AUTH ID para bater com o PUBLIC ID se possível, 
            -- Mas auth.users.id é PK. Melhor atualizar o PUBLIC user ID se não houver FKs,
            -- OU aceitar que são diferentes mas o email une (risco de segurança/bug se o sistema espera auth.uid() = public.users.id)
            
            -- CHECK: O sistema usa auth.uid() para RLS? Sim. 
            -- Se RLS usa auth.uid() = user_id, então transaction.user_id TEM que ser igual ao auth.uid().
            -- Se eles divergirem, o RLS vai falhar ou o usuário não verá seus dados.
            
            -- Vamos tentar atualizar o ID do usuário Auth para ser igual ao do perfil público (Dificil, pois é gerado pelo supabase)
            -- Vamos fazer o inverso: Tentar atualizar auth.users onde email = X para ter o ID Y? Não, ID é gerado.
            
            -- CORREÇÃO SEGURA: Vamos pegar o UUID do Auth User e atualizar o Public User.
            -- MAS se o usuario ja tem transações, vai quebrar FKs.
            
            -- Abordagem Pragmatica:
            -- Deletar usuario auth antigo (se não for o mesmo ID) e recriar com o ID do public profile?
            -- Auth users permite inserir com ID especifico? Sim.
        END IF;
    ELSE
        -- Criar novo usuário Auth se não existir
        RAISE NOTICE 'Criando usuário Auth...';
        
        -- Se já existe um perfil público, vamos tentar usar o MESMO ID para o Auth User
        -- Isso garante alinhamento perfeito.
        IF v_existing_profile_id IS NOT NULL THEN
            v_user_id := v_existing_profile_id;
        ELSE
            v_user_id := gen_random_uuid();
        END IF;

        INSERT INTO auth.users (
            instance_id,
            id,
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
            v_user_id,
            'authenticated',
            'authenticated',
            v_user_email,
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
        
        RAISE NOTICE 'Usuário Auth criado com ID % (Sincronizado com Public Profile)', v_user_id;

    END IF;

    -- Verificar Sincronia de IDs (Crucial para RLS e Logs)
    DECLARE
        v_final_auth_id uuid;
        v_final_public_id uuid;
    BEGIN
        SELECT id INTO v_final_auth_id FROM auth.users WHERE email = v_user_email;
        SELECT id INTO v_final_public_id FROM public.users WHERE email = v_user_email;
        
        IF v_final_auth_id <> v_final_public_id THEN
            RAISE WARNING 'ATENÇÃO: ID do Auth (%) e ID do Public Profile (%) são DIFERENTES!', v_final_auth_id, v_final_public_id;
            RAISE WARNING 'Isso pode causar problemas de permissão se o sistema espera que sejam iguais.';
            RAISE WARNING 'Tentando corrigir Public Profile para usar ID do Auth (Cuidado com FKs)...';
            
            BEGIN
                -- Tentar atualizar ID do public profile (Cascade deve ser configurado no banco, se não, vai falhar se tiver dados)
                -- Se falhar, é pq tem dados vinculados.
                UPDATE public.users SET id = v_final_auth_id WHERE email = v_user_email;
                RAISE NOTICE 'Public Profile ID atualizado com sucesso para %', v_final_auth_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Não foi possível migrar o ID do Public Profile (provavelmente FKs existem).';
                RAISE WARNING 'Erro: %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'IDs estão sincronizados. Tudo certo.';
        END IF;
    END;

END $$;
