-- Check franchise and staff relationships
SELECT 
    f.id as franchise_id,
    f.name as franchise_name,
    COUNT(s.id) as staff_count,
    COUNT(CASE WHEN s.role = 'manager' THEN 1 END) as managers,
    COUNT(CASE WHEN s.role = 'chef' THEN 1 END) as chefs,
    COUNT(CASE WHEN s.role IN ('waiter', 'cashier') THEN 1 END) as other_staff
FROM 
    franchises f
LEFT JOIN 
    staff s ON s.franchise_id = f.id
GROUP BY 
    f.id, f.name
ORDER BY 
    f.name;

-- Check for orphaned staff (no valid franchise)
SELECT 
    s.id,
    s.name,
    s.role,
    s.franchise_id
FROM 
    staff s
LEFT JOIN 
    franchises f ON f.id = s.franchise_id
WHERE 
    f.id IS NULL;

-- Check for users with invalid profile or franchise relationships
SELECT 
    u.id as user_id,
    u.email,
    p.id as profile_id,
    p.franchise_id,
    f.id as valid_franchise_id
FROM 
    auth.users u
LEFT JOIN 
    profiles p ON u.id = p.id
LEFT JOIN 
    franchises f ON p.franchise_id = f.id
WHERE 
    p.id IS NULL OR f.id IS NULL;
