import React, { useState, useEffect } from 'react';
import { Profile } from '../../types/settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ProfileEditDialogProps {
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => void;
}

export const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  profile,
  open,
  onClose,
  onSave,
}) => {
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setEditedProfile({ ...profile });
    } else {
      // Create new profile
      const now = new Date();
      setEditedProfile({
        id: `profile_${Date.now()}`,
        name: '',
        description: '',
        isDefault: false,
        providers: {},
        preferences: {
          temperature: 0.0,
          verbosity: 0,
          rateLimitSeconds: 5,
          consecutiveMistakeLimit: 3,
          language: 'zh',
          maxTokens: 4000,
          timeout: 30000,
          retryAttempts: 3,
        },
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
      });
    }
    setErrors([]);
  }, [profile, open]);

  const validateProfile = (profile: Profile): string[] => {
    const errors: string[] = [];

    if (!profile.name.trim()) {
      errors.push('Profile name is required');
    }

    if (profile.name.length > 50) {
      errors.push('Profile name must be less than 50 characters');
    }

    if (profile.description && profile.description.length > 200) {
      errors.push('Description must be less than 200 characters');
    }

    return errors;
  };

  const handleSave = () => {
    if (!editedProfile) return;

    const validationErrors = validateProfile(editedProfile);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave(editedProfile);
    onClose();
  };

  const handleNameChange = (value: string) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, name: value });
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, description: value });
    }
  };

  const handleDefaultChange = (checked: boolean) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, isDefault: checked });
    }
  };

  if (!editedProfile) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {profile ? 'Edit Profile' : 'New Profile'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="profile-name">Profile Name</Label>
            <Input
              id="profile-name"
              value={editedProfile.name}
              onChange={(e) => handleNameChange((e.target as HTMLInputElement).value)}
              placeholder="Enter profile name..."
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-description">Description (Optional)</Label>
            <Textarea
              value={editedProfile.description || ''}
              onChange={(e) => handleDescriptionChange((e.target as HTMLTextAreaElement).value)}
              placeholder="Enter profile description..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={editedProfile.isDefault}
              onCheckedChange={handleDefaultChange}
            />
            <Label htmlFor="is-default">Set as default profile</Label>
          </div>

          {editedProfile.isDefault && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This profile will be used as the default when the extension starts.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {profile ? 'Save Changes' : 'Create Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
