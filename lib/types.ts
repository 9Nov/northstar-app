export type Role = 'admin' | 'user'

export interface User {
  id: string
  username: string
  name: string
  surname: string
  role: Role
  section_id: string | null
  round_id: string | null
  created_at: string
}

export interface Round {
  id: string
  name: string
  is_open: boolean
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  name: string
  created_at: string
}

export interface NorthstarType {
  id: string
  name: string
  display_order: number
}

export interface RoundSectionQuota {
  id: string
  round_id: string
  section_id: string
  northstar_type_id: string
  quota: number
  created_at: string
  updated_at: string
}

export interface Registration {
  id: string
  user_id: string
  round_section_quota_id: string
  registered_at: string
  updated_at: string
}
