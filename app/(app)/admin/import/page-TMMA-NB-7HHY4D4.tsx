import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ImportClient from './ImportClient'

export default async function ImportPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'admin') redirect('/dashboard')

  return <ImportClient />
}
