import { beforeEach, describe, expect, mock, test } from "bun:test"

const signInMock = mock(async () => undefined)
const registerUserInKeycloakMock = mock(async () => ({ ok: true as const }))
const rateLimitMock = mock(() => ({ ok: true as const }))
const requestKeyMock = mock(() => "ip:test")

mock.module("@/auth", () => ({
  signIn: signInMock
}))

mock.module("@/lib/keycloak", () => ({
  registerUserInKeycloak: registerUserInKeycloakMock
}))

mock.module("@/lib/rate-limit", () => ({
  checkRateLimit: rateLimitMock
}))

mock.module("@/lib/request", () => ({
  getRequestKey: requestKeyMock
}))

describe("POST /api/account/signup", () => {
  beforeEach(() => {
    signInMock.mockClear()
    registerUserInKeycloakMock.mockClear()
    rateLimitMock.mockClear()
    requestKeyMock.mockClear()
  })

  test("blocks signups when the rate limit is exceeded", async () => {
    rateLimitMock.mockReturnValueOnce({ ok: false, remaining: 0, retryAfterSeconds: 600 })
    const { POST } = await import("@/app/api/account/signup/route")

    const formData = new FormData()
    formData.set("name", "Test User")
    formData.set("email", "test@example.com")
    formData.set("password", "password123")
    formData.set("confirmPassword", "password123")

    const response = await POST(
      new Request("http://localhost:3000/api/account/signup", {
        method: "POST",
        body: formData
      })
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toContain("error=try_again_later")
    expect(registerUserInKeycloakMock).not.toHaveBeenCalled()
    expect(signInMock).not.toHaveBeenCalled()
  })

  test("blocks bot-like signups that fill the hidden trap field", async () => {
    const { POST } = await import("@/app/api/account/signup/route")

    const formData = new FormData()
    formData.set("name", "Test User")
    formData.set("email", "test@example.com")
    formData.set("password", "password123")
    formData.set("confirmPassword", "password123")
    formData.set("signupFaxNumber", "555-111-2222")

    const response = await POST(
      new Request("http://localhost:3000/api/account/signup", {
        method: "POST",
        body: formData
      })
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toContain("error=try_again_later")
    expect(registerUserInKeycloakMock).not.toHaveBeenCalled()
    expect(signInMock).not.toHaveBeenCalled()
  })

  test("creates the user and signs them in for valid signup attempts", async () => {
    const { POST } = await import("@/app/api/account/signup/route")

    const formData = new FormData()
    formData.set("name", "Test User")
    formData.set("email", "test@example.com")
    formData.set("password", "password123")
    formData.set("confirmPassword", "password123")

    const response = await POST(
      new Request("http://localhost:3000/api/account/signup", {
        method: "POST",
        body: formData
      })
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("/dashboard")
    expect(registerUserInKeycloakMock).toHaveBeenCalledWith({
      name: "Test User",
      email: "test@example.com",
      password: "password123"
    })
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirectTo: "/dashboard"
    })
  })
})
