import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const SITE_URL = Deno.env.get("SITE_URL") || "https://productnerd.github.io/birthdayboard"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const MILESTONES = [10, 50]

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  const { board_id } = await req.json()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Count wishes for this board
  const { count } = await supabase
    .from("birthdayboard_wishes")
    .select("*", { count: "exact", head: true })
    .eq("board_id", board_id)

  if (!count || !MILESTONES.includes(count)) {
    return new Response(JSON.stringify({ skipped: true, count }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }

  // Get board info
  const { data: board } = await supabase
    .from("birthdayboard_boards")
    .select("*")
    .eq("id", board_id)
    .single()

  if (!board?.creator_email) {
    return new Response(JSON.stringify({ skipped: true, reason: "no email" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }

  const boardUrl = `${SITE_URL}/#/board/${board.slug}`

  const html = `
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #78350f; font-size: 28px;">${count} wishes and counting! 🎉</h1>
      <p style="color: #92400e; font-size: 18px; line-height: 1.6;">
        Hi ${board.creator_name},<br><br>
        <strong>${board.person_name}</strong>'s birthday board just hit <strong>${count} wishes</strong>!
      </p>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0 0 8px 0; font-weight: bold;">View the board:</p>
        <a href="${boardUrl}" style="color: #b45309; word-break: break-all;">${boardUrl}</a>
      </div>
    </div>
  `

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "BirthdayBoard <onboarding@resend.dev>",
      to: board.creator_email,
      subject: `${board.person_name}'s board just hit ${count} wishes!`,
      html,
    }),
  })

  const result = await res.json()

  return new Response(JSON.stringify({ sent: true, count, result }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  })
})
