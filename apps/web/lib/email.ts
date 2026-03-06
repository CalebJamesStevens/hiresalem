type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text: string
}

function getRequiredEnvValue(name: "RESEND_API_KEY" | "RESEND_FROM_EMAIL") {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const apiKey = getRequiredEnvValue("RESEND_API_KEY")
  const from = getRequiredEnvValue("RESEND_FROM_EMAIL")

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    })
  })

  if (!response.ok) {
    const body = (await response.text().catch(() => "")) || "Failed to send email"
    throw new Error(body)
  }

  return response.json().catch(() => ({}))
}
