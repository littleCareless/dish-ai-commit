import React from 'react';
import { Profile } from '../../types/settings';
import { Select, SelectOption } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProfileSelectorProps {
  profiles: Profile[];
  activeProfileId: string;
  onSelect: (profileId: string) => void;
  onCreate: () => void;
  onEdit: (profileId: string) => void;
  onDelete: (profileId: string) => void;
  onExport: (profileId: string) => void;
  onImport: () => void;
  className?: string;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  activeProfileId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onExport,
  onImport,
  className = '',
}) => {
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Profile Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Active Profile</label>
        <Select value={activeProfileId} onChange={(e) => onSelect((e.target as HTMLSelectElement).value)}>
          {profiles.map((profile) => (
            <SelectOption key={profile.id} value={profile.id}>
              {profile.name} {profile.isDefault ? '(Default)' : ''} - {Object.keys(profile.providers).length} providers
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Profile Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreate}>
          New Profile
        </Button>
        
        {activeProfile && (
          <>
            <Button
              onClick={() => onEdit(activeProfileId)}
              appearance="secondary"
            >
              Edit
            </Button>
            
            <Button
              onClick={() => onDelete(activeProfileId)}
              appearance="secondary"
            >
              Delete
            </Button>
            
            <Button
              onClick={() => onExport(activeProfileId)}
              appearance="secondary"
            >
              Export
            </Button>
          </>
        )}
        
        <Button
          onClick={onImport}
          appearance="secondary"
        >
          Import
        </Button>
      </div>

      {/* Profile Info */}
      {activeProfile && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{activeProfile.name}</span>
              <div className="flex items-center gap-2">
                {activeProfile.isDefault && (
                  <Badge variant="default" className="text-xs">Default</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {Object.keys(activeProfile.providers).length} providers
                </span>
              </div>
            </div>
            {activeProfile.description && (
              <p className="text-sm text-muted-foreground">{activeProfile.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Created: {new Date(activeProfile.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(activeProfile.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
