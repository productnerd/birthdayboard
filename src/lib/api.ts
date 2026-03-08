import { supabase } from './supabase'
import { generateSlug } from './slug'
import type { Board, Wish } from './types'

export async function createBoard(data: {
  person_name: string
  birthday_date: string
  creator_name: string
  prompt_note?: string
  person_image?: File
}): Promise<Board> {
  const slug = generateSlug()

  const { data: board, error } = await supabase
    .from('birthdayboard_boards')
    .insert({
      slug,
      person_name: data.person_name,
      birthday_date: data.birthday_date,
      creator_name: data.creator_name,
      prompt_note: data.prompt_note || null,
    })
    .select()
    .single()

  if (error) throw error

  if (data.person_image) {
    const ext = data.person_image.name.split('.').pop()
    const path = `boards/${board.id}/person.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('birthdayboard')
      .upload(path, data.person_image)
    if (uploadError) throw uploadError

    await supabase
      .from('birthdayboard_boards')
      .update({ person_image_path: path })
      .eq('id', board.id)

    board.person_image_path = path
  }

  return board
}

export async function getBoard(slug: string): Promise<Board | null> {
  const { data, error } = await supabase
    .from('birthdayboard_boards')
    .select()
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function createWish(data: {
  board_id: string
  author_name: string
  message: string
  photo?: File
}): Promise<Wish> {
  const { data: wish, error } = await supabase
    .from('birthdayboard_wishes')
    .insert({
      board_id: data.board_id,
      author_name: data.author_name,
      message: data.message,
      rotation_deg: Math.random() * 10 - 5,
      position_x: 0.2 + Math.random() * 0.6,
      position_y: 0.2 + Math.random() * 0.6,
    })
    .select()
    .single()

  if (error) throw error

  if (data.photo) {
    const ext = data.photo.name.split('.').pop()
    const path = `wishes/${wish.id}/photo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('birthdayboard')
      .upload(path, data.photo)
    if (uploadError) throw uploadError

    await supabase
      .from('birthdayboard_wishes')
      .update({ photo_path: path })
      .eq('id', wish.id)

    wish.photo_path = path
  }

  return wish
}

export async function getWishes(boardId: string): Promise<Wish[]> {
  const { data, error } = await supabase
    .from('birthdayboard_wishes')
    .select()
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateWishPosition(
  wishId: string,
  position_x: number,
  position_y: number,
): Promise<void> {
  await supabase
    .from('birthdayboard_wishes')
    .update({ position_x, position_y })
    .eq('id', wishId)
}
