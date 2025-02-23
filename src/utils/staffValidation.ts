import { supabase } from '../lib/supabase';

interface StaffValidationResult {
  isValid: boolean;
  staffId?: string;
  error?: string;
  details?: {
    staff_type?: string;
    franchise_id?: string;
    full_name?: string;
  };
}

export const validateStaffEmail = async (email: string): Promise<StaffValidationResult> => {
  try {
    // First check if email exists and is verified
    const { data: checkResult, error: checkError } = await supabase
      .rpc('check_staff_email', { p_email: email });

    if (checkError) {
      console.error('Error checking staff email:', checkError);
      return {
        isValid: false,
        error: checkError.code === '42501' 
          ? 'System configuration error. Please contact support.'
          : 'Unable to verify email status. Please try again later.'
      };
    }

    if (!checkResult || checkResult.length === 0 || !checkResult[0].email_exists) {
      return {
        isValid: false,
        error: 'Please contact your administrator to register your email'
      };
    }

    const result = checkResult[0];

    if (result.has_auth_id) {
      return {
        isValid: false,
        error: 'An account already exists for this email. Please sign in instead.'
      };
    }

    if (!result.is_verified) {
      return {
        isValid: false,
        error: 'Your email is pending verification by administrator'
      };
    }

    // Get staff details from the view
    const { data: staffRecord, error: staffError } = await supabase
      .from('staff_email_status')
      .select('id,staff_type,franchise_id,full_name')
      .eq('email', email)
      .maybeSingle();

    if (staffError || !staffRecord) {
      console.error('Error fetching staff details:', staffError);
      return {
        isValid: false,
        error: 'Unable to verify staff details'
      };
    }

    return {
      isValid: true,
      staffId: staffRecord.id,
      details: {
        staff_type: staffRecord.staff_type,
        franchise_id: staffRecord.franchise_id,
        full_name: staffRecord.full_name
      }
    };

  } catch (err) {
    console.error('Error in staff validation:', err);
    return {
      isValid: false,
      error: err instanceof Error ? err.message : 'Failed to validate email'
    };
  }
};
