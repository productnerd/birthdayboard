export interface Board {
  id: string
  slug: string
  person_name: string
  person_image_path: string | null
  birthday_date: string
  prompt_note: string | null
  creator_name: string
  creator_email: string | null
  headline: string | null
  headline_font: string | null
  created_at: string
}

export interface Wish {
  id: string
  board_id: string
  author_name: string
  message: string
  photo_path: string | null
  position_x: number | null
  position_y: number | null
  rotation_deg: number
  font_family: string
  created_at: string
}
