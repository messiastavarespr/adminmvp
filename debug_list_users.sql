-- Script de Diagnóstico: Listar usuários existentes
-- Execute isso para vermos o que *realmente* está na tabela users

SELECT 
    id, 
    email, 
    name, 
    role, 
    church_id 
FROM public.users;
