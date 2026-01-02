-- Force Create Public Profile
-- Links the existing Auth User (ea9ffc29...) to a new Public Profile
-- This fixes the "spinner hang" by bypassing the frontend creation logic

INSERT INTO public.users (
    id, 
    name, 
    email, 
    role, 
    church_id, 
    avatar_initials, 
    permissions
)
VALUES (
    'ea9ffc29-7ef2-40e4-879f-d9a25a9e7f62', -- ID from your screenshot
    'Messias (Master)',
    'msig12@gmail.com',
    'MASTER',
    (SELECT id FROM public.churches LIMIT 1), -- Picks the first available church
    'MS',
    '{
        "manageCategories": true, 
        "manageAccounts": true, 
        "manageCostCenters": true, 
        "manageBudgets": true, 
        "manageChurches": true, 
        "manageUsers": true, 
        "manageFunds": true, 
        "viewAuditLog": true, 
        "performBackup": true, 
        "performRestore": true
    }'::jsonb
);
