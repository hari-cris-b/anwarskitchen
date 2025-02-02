import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFranchise() {
  try {
    // Sign in as admin to get access
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });

    if (authError) {
      throw authError;
    }

    // Create a new franchise
    const { data: franchise, error: franchiseError } = await supabase
      .from('franchises')
      .insert([
        {
          name: 'Default Franchise',
          settings: {
            currency: 'INR',
            tax_rate: 0.18,
            menu_categories: ['All']
          }
        }
      ])
      .select()
      .single();

    if (franchiseError) {
      console.error('Franchise error:', franchiseError);
      throw franchiseError;
    }

    console.log('Created franchise:', franchise);

    // Get the first user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      throw new Error('No profile found');
    }

    // Update the profile with the franchise ID
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ franchise_id: franchise.id })
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('Updated profile:', updatedProfile);
    console.log('Successfully created franchise and assigned to profile');

    // Sign out
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

createFranchise();
