import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, useCurrentUser } from '@/lib/auth-context'

export function ProfileSettings() {
  const currentUser = useCurrentUser()
  const { updateProfile, changePassword } = useAuth()

  const [displayName, setDisplayName] = useState(currentUser.name)
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileSubmitting(true)
    setProfileError(null)
    setProfileSaved(false)
    const { error } = await updateProfile({ displayName: displayName.trim(), phoneNumber: phoneNumber.trim() })
    setProfileSubmitting(false)
    if (error) {
      setProfileError(error)
      return
    }
    setProfileSaved(true)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordSubmitting(true)
    setPasswordError(null)
    setPasswordSaved(false)
    const { error } = await changePassword(password)
    setPasswordSubmitting(false)
    if (error) {
      setPasswordError(error)
      return
    }
    setPassword('')
    setConfirmPassword('')
    setPasswordSaved(true)
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 p-8">
      <h1 className="font-heading text-xl font-semibold">Profile Settings</h1>

      <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold">Profile</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              setProfileSaved(false)
            }}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone-number">Handphone Number</Label>
          <Input
            id="phone-number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value)
              setProfileSaved(false)
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={currentUser.email} disabled />
        </div>

        {profileError && <p className="text-sm text-destructive">{profileError}</p>}
        {profileSaved && <p className="text-sm text-muted-foreground">Saved.</p>}

        <Button type="submit" disabled={!displayName.trim() || profileSubmitting} className="self-start">
          Save Profile
        </Button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold">Change Password</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setPasswordSaved(false)
            }}
            required
            minLength={6}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setPasswordSaved(false)
            }}
            required
            minLength={6}
          />
        </div>

        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        {passwordSaved && <p className="text-sm text-muted-foreground">Password changed.</p>}

        <Button type="submit" disabled={!password || passwordSubmitting} className="self-start">
          Change Password
        </Button>
      </form>
    </div>
  )
}
