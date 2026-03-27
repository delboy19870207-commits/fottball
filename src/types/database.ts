export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CM' | 'DM' | 'AM' | 'LW' | 'RW' | 'ST'
export type Venue = 'home' | 'away' | 'neutral'
export type Competition = 'league' | 'cup' | 'friendly'
export type FlagType = 'standout' | 'developing' | 'concern' | 'injury_risk'

export interface Club {
  id: string
  name: string
  founded_year: number | null
  league_tier: number | null
  country: string
  created_at: string
}

export interface AgeGroup {
  id: string
  club_id: string
  name: string
  season: string
}

export interface Player {
  id: string
  club_id: string
  age_group_id: string
  first_name: string
  last_name: string
  dob: string | null
  position: Position
  height_cm: number | null
  weight_kg: number | null
  joined_date: string | null
  is_active: boolean
  created_at: string
  // joined relations
  age_group?: AgeGroup
}

export interface Match {
  id: string
  club_id: string
  age_group_id: string
  date: string
  opposition: string
  venue: Venue
  our_score: number
  their_score: number
  formation: string | null
  competition: Competition
  coach_notes: string | null
  created_at: string
  // joined relations
  age_group?: AgeGroup
}

export interface MatchPlayerRating {
  id: string
  match_id: string
  player_id: string
  minutes_played: number
  effort_rating: number
  technical_rating: number
  decision_rating: number
  physical_rating: number
  scored_goal: boolean
  got_assist: boolean
  // joined relations
  player?: Player
  match?: Match
}

export interface TrainingSession {
  id: string
  club_id: string
  age_group_id: string
  date: string
  duration_minutes: number
  players_attended: number
  focus_tags: string[]
  coach_notes: string | null
  created_at: string
  // joined relations
  age_group?: AgeGroup
}

export interface SessionPlayerFlag {
  id: string
  session_id: string
  player_id: string
  flag_type: FlagType
  note: string | null
  // joined relations
  player?: Player
}

// Calculated types
export interface PlayerWithStats extends Player {
  appearances: number
  goals: number
  assists: number
  development_score: number
  trend: 'up' | 'stable' | 'down'
}

export interface DevelopmentScore {
  score: number
  date: string
  match_id: string
}
