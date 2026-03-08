"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Eye, EyeOff } from "lucide-react"
import { login, saveSession } from "@/lib/aetherscan-client"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("admin@aetherscan.local")
  const [password, setPassword] = useState("Admin123!")
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const session = await login(email, password)
      saveSession(session)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary text-primary-foreground mb-4"><Shield className="size-8" /></div>
          <h1 className="text-3xl font-bold tracking-tight">AetherScan</h1>
          <p className="text-muted-foreground mt-2">Internal Network Security Scanner</p>
        </div>

        <Card>
          <CardHeader className="text-center"><CardTitle>Sign In</CardTitle><CardDescription>Use one of the local system accounts to access the platform</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}<span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span></Button></div></div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Signing in..." : "Sign In"}</Button>
            </form>
            <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground mb-2">Local test accounts</p><p>`admin@aetherscan.local` / `Admin123!`</p><p>`engineer@aetherscan.local` / `Engineer123!`</p><p>`tech@aetherscan.local` / `Tech123!`</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
