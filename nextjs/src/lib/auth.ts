import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Authenticate the current user and look up their business.
 * Returns { user, business, supabase } on success, or a NextResponse error.
 */
export async function authenticateAndGetBusiness() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return { user, business, supabase }
}
