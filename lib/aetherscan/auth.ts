import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import type { Agent, Session, User, UserRole } from "@/lib/aetherscan/types"
import { readDatabase } from "@/lib/aetherscan/store"
import { hashPassword, nowIso } from "@/lib/aetherscan/utils"

type JwtPayload = {
  sub: string
  email: string
  role: UserRole
  type: "user"
  exp: number
  iat: number
}

const DEFAULT_JWT_SECRET = "aetherscan-dev-secret-change-me"

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url")
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function getJwtSecret() {
  return process.env.AETHERSCAN_JWT_SECRET || DEFAULT_JWT_SECRET
}

function signRawJwt(payload: JwtPayload) {
  const header = { alg: "HS256", typ: "JWT" }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac("sha256", getJwtSecret()).update(unsigned).digest("base64url")
  return `${unsigned}.${signature}`
}

function verifyRawJwt(token: string): JwtPayload | null {
  const segments = token.split(".")
  if (segments.length !== 3) return null
  const [encodedHeader, encodedPayload, signature] = segments
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = createHmac("sha256", getJwtSecret()).update(unsigned).digest()
  const receivedSignature = Buffer.from(signature, "base64url")
  if (expectedSignature.length !== receivedSignature.length) return null
  if (!timingSafeEqual(expectedSignature, receivedSignature)) return null

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload
  if (payload.type !== "user") return null
  if (payload.exp * 1000 < Date.now()) return null
  return payload
}

export function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null
}

export async function authenticateUser(email: string, password: string) {
  const database = await readDatabase()
  const passwordHash = hashPassword(password)
  return (
    database.users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        user.passwordHash === passwordHash &&
        user.status === "active",
    ) ?? null
  )
}

export function issueJwtForUser(user: User, expiresInHours = 12) {
  const issuedAt = Math.floor(Date.now() / 1000)
  return signRawJwt({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "user",
    iat: issuedAt,
    exp: issuedAt + expiresInHours * 60 * 60,
  })
}

function sessionIsActive(session: Session) {
  return new Date(session.expiresAt).getTime() > Date.now()
}

export async function getCurrentSession(request: Request): Promise<Session | null> {
  const token = extractBearerToken(request)
  if (!token) return null
  const payload = verifyRawJwt(token)
  if (!payload) return null
  const database = await readDatabase()
  return database.sessions.find((session) => session.token === token && session.userId === payload.sub && sessionIsActive(session)) ?? null
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const token = extractBearerToken(request)
  if (!token) return null
  const payload = verifyRawJwt(token)
  if (!payload) return null
  const database = await readDatabase()
  const session = database.sessions.find((entry) => entry.token === token && entry.userId === payload.sub && sessionIsActive(entry))
  if (!session) return null
  session.lastSeenAt = nowIso()
  return database.users.find((user) => user.id === payload.sub && user.status === "active") ?? null
}

export async function getAgentFromRequest(request: Request): Promise<Agent | null> {
  const token = request.headers.get("x-agent-token")
  if (!token) return null
  const database = await readDatabase()
  return database.agents.find((agent) => agent.authToken === token) ?? null
}

export async function requireUser(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { user, response: null }
}

export async function requireUserRole(request: Request, allowedRoles: UserRole[]) {
  const { user, response } = await requireUser(request)
  if (!user) return { user: null, response }
  if (!allowedRoles.includes(user.role)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user, response: null }
}

export async function requireAgent(request: Request) {
  const agent = await getAgentFromRequest(request)
  if (!agent) {
    return { agent: null, response: NextResponse.json({ error: "Invalid agent token" }, { status: 401 }) }
  }
  return { agent, response: null }
}
