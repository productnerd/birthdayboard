import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const SITE_URL = Deno.env.get("SITE_URL") || "https://productnerd.github.io/birthdayboard"

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

  const { creator_email, creator_name, person_name, slug } = await req.json()

  const boardUrl = `${SITE_URL}/#/board/${slug}`
  const shareUrl = boardUrl

  const html = `
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #78350f; font-size: 28px;">Your Birthday Board is ready! 🎂</h1>
      <p style="color: #92400e; font-size: 18px; line-height: 1.6;">
        Hi ${creator_name},<br><br>
        Your birthday board for <strong>${person_name}</strong> has been created!
      </p>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0 0 8px 0; font-weight: bold;">View the board:</p>
        <a href="${boardUrl}" style="color: #b45309; word-break: break-all;">${boardUrl}</a>
      </div>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; margin: 0 0 8px 0; font-weight: bold;">Share this link with friends:</p>
        <a href="${shareUrl}" style="color: #b45309; word-break: break-all;">${shareUrl}</a>
      </div>
      <p style="color: #a8a29e; font-size: 14px; margin-top: 32px;">
        We'll notify you when the board reaches 10 and 50 wishes!
      </p>
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
      to: creator_email,
      subject: `Your birthday board for ${person_name} is live!`,
      html,
    }),
  })

  const result = await res.json()

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
})
