/**
 * Seed script for Cascade Youth FC Player Development Platform
 *
 * Usage:
 *   1. Copy .env.local.example → .env.local and fill in your Supabase credentials
 *   2. npm run seed
 *
 * What it creates:
 *   - 1 club: Cascade Youth FC
 *   - 4 age groups: U12, U14, U16, U18
 *   - 10-12 players per age group (Welsh names)
 *   - 5-6 matches per age group with player ratings
 *   - 4-5 training sessions per age group with player flags
 *   - A seed coach account linked to the club
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CM' | 'DM' | 'AM' | 'LW' | 'RW' | 'ST'
type Venue = 'home' | 'away' | 'neutral'
type Competition = 'league' | 'cup' | 'friendly'
type FlagType = 'standout' | 'developing' | 'concern' | 'injury_risk'

const WELSH_FIRST_NAMES = [
  'Rhys', 'Owain', 'Gethin', 'Iwan', 'Cai', 'Bran', 'Emyr', 'Huw',
  'Sion', 'Dai', 'Gareth', 'Liam', 'Evan', 'Osian', 'Tomos', 'Aled',
  'Gwion', 'Macsen', 'Caolan', 'Ifan', 'Dylan', 'Steffan', 'Wynne', 'Bryn',
]

const WELSH_LAST_NAMES = [
  'Jones', 'Williams', 'Davies', 'Evans', 'Thomas', 'Roberts', 'Lewis',
  'Hughes', 'Morgan', 'Griffiths', 'Edwards', 'Owen', 'Jenkins', 'Price',
  'Rees', 'Phillips', 'Powell', 'Pritchard', 'Lloyd', 'Parry',
]

const WELSH_CLUBS = [
  'Newport City FC', 'Pontypridd United', 'Barry Town', 'Haverfordwest County',
  'Caernarfon Town', 'Aberystwyth Town', 'Rhyl FC', 'Connah\'s Quay Nomads',
  'Flint Town United', 'Carmarthen Town', 'Llanelli Town', 'Merthyr Town',
  'Swansea City Dev', 'Cardiff City Dev', 'Wrexham Youth',
]

const FOCUS_TAGS_POOL = [
  'Technical', 'Tactical', 'Pressing', 'Set pieces',
  'Physical', 'Small-sided', 'Transition', '1v1',
]

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '4-5-1']

const COACH_NOTES_TEMPLATES = [
  'Good collective shape in the first half. Need to work on our press triggers.',
  'Excellent intensity from the first whistle. Transition play was sharp today.',
  'Struggled to break down a deep defence. Set pieces need more rehearsal.',
  'Some individual brilliance but we need to improve our compactness out of possession.',
  'Strong defensive performance. Forwards need to be more clinical in front of goal.',
  'Good movement and combination play through the thirds. Proud of the group today.',
]

const SESSION_NOTES = [
  'Focused on positional rondos and pressing triggers. Good energy throughout.',
  'Finishing drill session. Worked on near-post and far-post movement patterns.',
  'Defensive shape and transition. Highlighted moments from last match footage.',
  'Set pieces — attacking corners and free kicks. Excellent buy-in from players.',
  'Small-sided games with conditioning element. Players responded well.',
]

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, dp = 1): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pastDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function dobForAgeGroup(agName: string): string {
  const ageMap: Record<string, number> = { U12: 12, U14: 14, U16: 16, U18: 18 }
  const age = ageMap[agName] ?? 14
  const jitter = rand(-12, 12) // months jitter
  const d = new Date()
  d.setFullYear(d.getFullYear() - age)
  d.setMonth(d.getMonth() + jitter)
  return d.toISOString().split('T')[0]
}

function heightForAge(agName: string): number {
  const base: Record<string, number> = { U12: 148, U14: 158, U16: 168, U18: 174 }
  return (base[agName] ?? 160) + rand(-8, 8)
}

function weightForHeight(h: number): number {
  return Math.round(h * 0.43 + rand(-3, 3))
}

const POSITION_LIST: Position[] = ['GK', 'CB', 'LB', 'RB', 'CM', 'DM', 'AM', 'LW', 'RW', 'ST']

function squadPositions(count: number): Position[] {
  // Sensible squad distribution
  const template: Position[] = ['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'LW', 'RW', 'ST', 'ST']
  const base = template.slice(0, count)
  while (base.length < count) base.push(pick(POSITION_LIST))
  return shuffle(base)
}

function usedNames(): Set<string> {
  return new Set<string>()
}

// ─────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting seed for Cascade Youth FC…\n')

  // ── Club ──────────────────────────────────
  console.log('Creating club…')
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .insert({ name: 'Cascade Youth FC', founded_year: 1987, league_tier: 5, country: 'Wales' })
    .select('id')
    .single()

  if (clubErr) throw new Error(`Club: ${clubErr.message}`)
  console.log(`  ✓ Club created: ${club.id}`)

  // ── Coach account ─────────────────────────
  console.log('\nCreating seed coach account…')
  const seedEmail = 'coach@cascadefc.wales'
  const seedPassword = 'Cascade2024!'

  // Delete existing if re-running
  const { data: existing } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', seedEmail)
    .single()
    .catch(() => ({ data: null }))

  let coachUserId: string

  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: seedEmail,
    password: seedPassword,
    email_confirm: true,
  })

  if (authErr && authErr.message.includes('already')) {
    // User exists; fetch their ID
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const found = users.find((u) => u.email === seedEmail)
    if (!found) throw new Error('Could not find existing coach user')
    coachUserId = found.id
    console.log(`  ✓ Using existing coach: ${coachUserId}`)
  } else if (authErr) {
    throw new Error(`Auth: ${authErr.message}`)
  } else {
    coachUserId = authUser.user.id
    console.log(`  ✓ Coach created: ${coachUserId}`)
  }

  // Link coach to club
  await supabase
    .from('coach_clubs')
    .upsert({ user_id: coachUserId, club_id: club.id })

  console.log(`  ✓ Coach linked to club`)
  console.log(`\n  📧 Login: ${seedEmail}`)
  console.log(`  🔑 Password: ${seedPassword}\n`)

  // ── Age groups ────────────────────────────
  console.log('Creating age groups…')
  const AGE_GROUP_NAMES = ['U12', 'U14', 'U16', 'U18']
  const ageGroupRows = AGE_GROUP_NAMES.map((name) => ({
    club_id: club.id,
    name,
    season: '2024/25',
  }))

  const { data: ageGroups, error: agErr } = await supabase
    .from('age_groups')
    .insert(ageGroupRows)
    .select('id, name')

  if (agErr) throw new Error(`Age groups: ${agErr.message}`)
  console.log(`  ✓ ${ageGroups.length} age groups created`)

  // ── Players ───────────────────────────────
  console.log('\nCreating players…')
  const usedNamesSet = new Set<string>()

  function uniqueName(): { first: string; last: string } {
    let attempts = 0
    while (attempts < 100) {
      const first = pick(WELSH_FIRST_NAMES)
      const last = pick(WELSH_LAST_NAMES)
      const key = `${first} ${last}`
      if (!usedNamesSet.has(key)) {
        usedNamesSet.add(key)
        return { first, last }
      }
      attempts++
    }
    // Fallback with suffix
    const first = pick(WELSH_FIRST_NAMES)
    const last = pick(WELSH_LAST_NAMES) + rand(1, 99)
    return { first, last: last.toString() }
  }

  const allPlayers: Array<{ id: string; age_group_id: string; age_group_name: string }> = []

  for (const ag of ageGroups) {
    const count = rand(10, 12)
    const positions = squadPositions(count)
    const playerRows = Array.from({ length: count }, (_, i) => {
      const { first, last } = uniqueName()
      const dob = dobForAgeGroup(ag.name)
      const h = heightForAge(ag.name)
      return {
        club_id: club.id,
        age_group_id: ag.id,
        first_name: first,
        last_name: last,
        dob,
        position: positions[i],
        height_cm: h,
        weight_kg: weightForHeight(h),
        joined_date: pastDate(rand(60, 730)),
        is_active: true,
      }
    })

    const { data: players, error: pErr } = await supabase
      .from('players')
      .insert(playerRows)
      .select('id, age_group_id')

    if (pErr) throw new Error(`Players (${ag.name}): ${pErr.message}`)
    for (const p of players) {
      allPlayers.push({ ...p, age_group_name: ag.name })
    }
    console.log(`  ✓ ${ag.name}: ${players.length} players`)
  }

  // ── Matches ───────────────────────────────
  console.log('\nCreating matches with ratings…')

  for (const ag of ageGroups) {
    const agPlayers = allPlayers.filter((p) => p.age_group_id === ag.id)
    const matchCount = rand(5, 6)

    for (let m = 0; m < matchCount; m++) {
      const ourScore = rand(0, 5)
      const theirScore = rand(0, 4)
      const venues: Venue[] = ['home', 'away', 'neutral']
      const competitions: Competition[] = ['league', 'cup', 'friendly']

      const { data: match, error: mErr } = await supabase
        .from('matches')
        .insert({
          club_id: club.id,
          age_group_id: ag.id,
          date: pastDate(rand(5, 90)),
          opposition: pick(WELSH_CLUBS),
          venue: pick(venues),
          our_score: ourScore,
          their_score: theirScore,
          formation: pick(FORMATIONS),
          competition: pick(competitions),
          coach_notes: pick(COACH_NOTES_TEMPLATES),
        })
        .select('id')
        .single()

      if (mErr) throw new Error(`Match: ${mErr.message}`)

      // Rate all players
      const ratingRows = agPlayers.map((p) => {
        // Randomise which players scored/assisted based on score
        const isScorer = ourScore > 0 && Math.random() < ourScore / (agPlayers.length * 0.8)
        const isAssist = ourScore > 0 && Math.random() < ourScore / (agPlayers.length * 0.8)

        return {
          match_id: match.id,
          player_id: p.id,
          minutes_played: rand(60, 90),
          effort_rating: rand(5, 10),
          technical_rating: rand(4, 10),
          decision_rating: rand(4, 10),
          physical_rating: rand(5, 10),
          scored_goal: isScorer,
          got_assist: isAssist && !isScorer,
        }
      })

      const { error: rErr } = await supabase.from('match_player_ratings').insert(ratingRows)
      if (rErr) throw new Error(`Ratings: ${rErr.message}`)
    }

    console.log(`  ✓ ${ag.name}: ${matchCount} matches with ratings`)
  }

  // ── Training sessions ─────────────────────
  console.log('\nCreating training sessions with flags…')

  const FLAG_TYPES: FlagType[] = ['standout', 'developing', 'concern', 'injury_risk']
  const FLAG_NOTES: Record<FlagType, string[]> = {
    standout: [
      'Exceptional technical display today',
      'Led the press brilliantly, excellent positioning',
      'Hat-trick in small-sided — great composure under pressure',
      'Best session of the season, dominant in 1v1s',
    ],
    developing: [
      'Showing real improvement in decision-making',
      'Pressing movements are clicking — keep building',
      'Receiving on the back foot is much better this week',
      'Steady improvement in positional awareness',
    ],
    concern: [
      'Struggled to engage today, needs individual focus',
      'Concentration dipped in the second block',
      'Losing duels — may need extra 1v1 work',
      'Late to training twice this week — check in with parents',
    ],
    injury_risk: [
      'Carrying a slight knock to left ankle — monitor',
      'Came off with tightness in hamstring, advise rest',
      'Rolled ankle in 5v5 — assess before next session',
      'Mentioned knee pain before session — refer to physio',
    ],
  }

  for (const ag of ageGroups) {
    const agPlayers = allPlayers.filter((p) => p.age_group_id === ag.id)
    const sessionCount = rand(4, 5)

    for (let s = 0; s < sessionCount; s++) {
      const tagCount = rand(2, 4)
      const tags = shuffle(FOCUS_TAGS_POOL).slice(0, tagCount)

      const { data: session, error: sErr } = await supabase
        .from('training_sessions')
        .insert({
          club_id: club.id,
          age_group_id: ag.id,
          date: pastDate(rand(3, 60)),
          duration_minutes: pick([60, 75, 90, 90, 75]),
          players_attended: rand(Math.floor(agPlayers.length * 0.7), agPlayers.length),
          focus_tags: tags,
          coach_notes: pick(SESSION_NOTES),
        })
        .select('id')
        .single()

      if (sErr) throw new Error(`Session: ${sErr.message}`)

      // Add 1-3 flags per session
      const flagCount = rand(1, 3)
      const flagPlayers = shuffle(agPlayers).slice(0, flagCount)
      const flagRows = flagPlayers.map((p) => {
        const ft = pick(FLAG_TYPES)
        return {
          session_id: session.id,
          player_id: p.id,
          flag_type: ft,
          note: pick(FLAG_NOTES[ft]),
        }
      })

      const { error: fErr } = await supabase.from('session_player_flags').insert(flagRows)
      if (fErr) throw new Error(`Flags: ${fErr.message}`)
    }

    console.log(`  ✓ ${ag.name}: ${sessionCount} sessions`)
  }

  // ── Summary ───────────────────────────────
  console.log('\n─────────────────────────────────')
  console.log('✅ Seed complete!\n')
  console.log(`Club: Cascade Youth FC`)
  console.log(`Age groups: ${ageGroups.map((ag) => ag.name).join(', ')}`)
  console.log(`Total players: ${allPlayers.length}`)
  console.log(`\nCoach login credentials:`)
  console.log(`  Email:    ${seedEmail}`)
  console.log(`  Password: ${seedPassword}`)
  console.log('─────────────────────────────────\n')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
