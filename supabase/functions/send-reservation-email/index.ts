// Supabase Edge Function: send-reservation-email
//
// Sends a German confirmation email to the guest (and a notification to the
// restaurant) via Resend. Runs on Deno — the RESEND_API_KEY lives ONLY here
// as an edge-function secret and is NEVER exposed to the browser.
//
// Deploy:  supabase functions deploy send-reservation-email
// Secret:  supabase secrets set RESEND_API_KEY=re_xxx
//          supabase secrets set FROM_EMAIL="Zum Anker <reservierung@ihre-domain.de>"
//          supabase secrets set RESTAURANT_EMAIL="info@ihre-domain.de"  (optional)

interface ReservationPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  reservation_date: string
  reservation_time: string
  party_size: number
  seating: string
  special_requests?: string | null
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function guestEmailHtml(r: ReservationPayload): string {
  return `
  <div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:auto;color:#221c1a;background:#f4efea;padding:32px;border:1px solid #e0d6ca">
    <div style="text-align:center;border-bottom:1px solid #d8ccbf;padding-bottom:20px;margin-bottom:24px">
      <div style="font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:#581825">Zum Anker</div>
      <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#756b66;margin-top:6px">Trier-Pfalzel · Seit 1896</div>
    </div>
    <h1 style="font-size:26px;color:#581825;font-weight:500;margin:0 0 12px">Vielen Dank für Ihre Reservierung, ${r.first_name}.</h1>
    <p style="font-size:14px;line-height:1.7;color:#4a423e">
      Wir haben Ihre Anfrage erhalten und melden uns in Kürze mit einer Bestätigung.
      Hier Ihre Angaben im Überblick:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
      <tr><td style="padding:9px 0;color:#756b66">Datum</td><td style="padding:9px 0;text-align:right"><b>${formatDate(r.reservation_date)}</b></td></tr>
      <tr><td style="padding:9px 0;color:#756b66;border-top:1px solid #e0d6ca">Uhrzeit</td><td style="padding:9px 0;text-align:right;border-top:1px solid #e0d6ca"><b>${r.reservation_time} Uhr</b></td></tr>
      <tr><td style="padding:9px 0;color:#756b66;border-top:1px solid #e0d6ca">Personen</td><td style="padding:9px 0;text-align:right;border-top:1px solid #e0d6ca"><b>${r.party_size}</b></td></tr>
      <tr><td style="padding:9px 0;color:#756b66;border-top:1px solid #e0d6ca">Bereich</td><td style="padding:9px 0;text-align:right;border-top:1px solid #e0d6ca"><b>${r.seating}</b></td></tr>
      ${
        r.special_requests
          ? `<tr><td style="padding:9px 0;color:#756b66;border-top:1px solid #e0d6ca">Wünsche</td><td style="padding:9px 0;text-align:right;border-top:1px solid #e0d6ca">${r.special_requests}</td></tr>`
          : ""
      }
    </table>
    <p style="font-size:13px;line-height:1.7;color:#756b66">
      Müssen Sie Ihre Reservierung ändern? Rufen Sie uns an: +49 651 981 42 60.
    </p>
    <p style="font-size:13px;color:#581825;margin-top:24px">Herzlich willkommen am Moselufer.<br/>Ihr Team vom Zum Anker</p>
  </div>`
}

function restaurantEmailHtml(r: ReservationPayload): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
    <h2 style="color:#581825">Neue Reservierungsanfrage</h2>
    <ul style="font-size:14px;line-height:1.8;list-style:none;padding:0">
      <li><b>Gast:</b> ${r.first_name} ${r.last_name}</li>
      <li><b>Datum:</b> ${formatDate(r.reservation_date)} um ${r.reservation_time} Uhr</li>
      <li><b>Personen:</b> ${r.party_size}</li>
      <li><b>Bereich:</b> ${r.seating}</li>
      <li><b>E-Mail:</b> ${r.email}</li>
      <li><b>Telefon:</b> ${r.phone}</li>
      ${r.special_requests ? `<li><b>Wünsche:</b> ${r.special_requests}</li>` : ""}
    </ul>
  </div>`
}

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend ${res.status}: ${text}`)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const apiKey = Deno.env.get("RESEND_API_KEY")
  const from = Deno.env.get("FROM_EMAIL") ?? "Zum Anker <onboarding@resend.dev>"
  const restaurantEmail = Deno.env.get("RESTAURANT_EMAIL")

  if (!apiKey) {
    return json({ error: "RESEND_API_KEY ist nicht gesetzt." }, 500)
  }

  let r: ReservationPayload
  try {
    r = (await req.json()) as ReservationPayload
  } catch {
    return json({ error: "Ungültiger Request-Body." }, 400)
  }

  if (!r?.email || !r?.first_name) {
    return json({ error: "Pflichtfelder fehlen." }, 400)
  }

  try {
    await sendViaResend(
      apiKey,
      from,
      r.email,
      "Ihre Reservierung im Zum Anker",
      guestEmailHtml(r),
    )
    // Benachrichtigung ans Restaurant ist optional und darf nicht fehlschlagen lassen.
    if (restaurantEmail) {
      try {
        await sendViaResend(
          apiKey,
          from,
          restaurantEmail,
          `Neue Reservierung: ${r.first_name} ${r.last_name}`,
          restaurantEmailHtml(r),
        )
      } catch (err) {
        console.error("Restaurant-Benachrichtigung fehlgeschlagen:", err)
      }
    }
    return json({ ok: true })
  } catch (err) {
    console.error("E-Mail-Versand fehlgeschlagen:", err)
    return json({ error: (err as Error).message }, 502)
  }
})
