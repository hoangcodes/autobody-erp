import * as React from 'react'
import { X, ImagePlus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { useRoleStore } from '@/features/auth/roleStore'
import { useProfilePhotos } from '@/features/auth/profilePhotoStore'

export interface UserSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * User Settings modal. Houses the profile-photo upload/remove (moved out of the
 * top-bar account dropdown) plus a read-only summary of the current identity.
 * Distinct from the environment/shop `/settings` page. Photos persist via the
 * shared `profilePhotoStore` (data-URL in localStorage, keyed by user id).
 */
export function UserSettingsModal({ open, onOpenChange }: UserSettingsModalProps) {
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const { data: me } = useAuth()
  const role = useRoleStore((s) => s.role)
  const profilePhotos = useProfilePhotos((s) => s.photos)
  const setPhoto = useProfilePhotos((s) => s.setPhoto)
  const removePhoto = useProfilePhotos((s) => s.removePhoto)

  const myPhoto = me ? profilePhotos[me.user.id] : undefined
  const userName = me
    ? `${me.user.firstName ?? ''} ${me.user.lastName ?? ''}`.trim() || me.user.email
    : 'User'

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so re-selecting the same file fires onChange again.
    e.target.value = ''
    if (!file || !me) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhoto(me.user.id, reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>User Settings</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {/* Identity summary */}
          <div className="flex items-center gap-4">
            <Avatar size="lg" name={userName} src={myPhoto} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{userName}</p>
              {me?.user.email && (
                <p className="truncate text-sm text-muted-foreground">{me.user.email}</p>
              )}
              <p className="text-sm text-muted-foreground">Role: {role}</p>
            </div>
          </div>

          {/* Profile photo upload / remove (moved here from the account dropdown) */}
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Profile photo
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <ImagePlus className="h-3.5 w-3.5" />
                {myPhoto ? 'Change photo' : 'Upload photo'}
              </Button>
              {myPhoto && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => me && removePhoto(me.user.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove photo
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Stored on this device only. Falls back to your initials when no photo is set.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
