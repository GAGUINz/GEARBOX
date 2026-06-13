'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login error:', error)
    return { error: error.message }
  }

  // Verifica se é admin para mandar pro dashboard, senao pro portal do cliente
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', authData.user.id).single()
  
  if (profile?.is_admin) {
    redirect('/dashboard')
  } else {
    redirect('/')
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
        whatsapp: formData.get('whatsapp') as string,
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Signup error:', error)
    return { error: error.message }
  }

  redirect('/')
}
