import { createServerSupabaseClient } from '@/lib/supabase-server'
import SessionLogForm from './SessionLogForm'

export default async function SessionLogPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: coachClub } = await supabase
    .from('coach_clubs')
    .select('club_id')
    .eq('user_id', user!.id)
    .single()

  if (!coachClub) {
    return <div className="p-8 text-slate-400">No club assigned to your account.</div>
  }

  const { data: ageGroups } = await supabase
    .from('age_groups')
    .select('id, name')
    .eq('club_id', coachClub.club_id)
    .order('name')

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Log a Training Session</h1>
        <p className="text-slate-400 text-sm mt-0.5">Record session details and flag individual player observations</p>
      </div>
      <SessionLogForm clubId={coachClub.club_id} ageGroups={ageGroups ?? []} />
    </div>
  )
}
