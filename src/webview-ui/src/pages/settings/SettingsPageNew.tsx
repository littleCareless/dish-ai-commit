import React, { useState, useEffect } from 'react';
import { Profile, DEFAULT_USER_PREFERENCES } from '../../types/settings';
import { ProfileSelector } from '../../components/settings/ProfileSelector';
import { ProfileEditDialog } from '../../components/settings/ProfileEditDialog';
import { AdvancedSettings } from '../../components/settings/AdvancedSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { profileManager } from '../../services/profile-manager';
import { ProvidersSettings } from './ProvidersSettings';
import { FeaturesSettings } from './FeaturesSettings';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';

export const SettingsPageNew: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [selectedTab, setSelectedTab] = useState('providers');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load profiles on component mount
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const loadedProfiles = await profileManager.loadProfiles();
        setProfiles(loadedProfiles);
        
        const active = profileManager.getActiveProfile();
        setActiveProfile(active);
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    };

    loadProfiles();

    // Subscribe to profile changes
    const unsubscribe = profileManager.subscribe((updatedProfiles, activeId) => {
      setProfiles(updatedProfiles);
      const active = activeId ? updatedProfiles.find(p => p.id === activeId) || null : null;
      setActiveProfile(active);
    });

    return unsubscribe;
  }, []);

  const handleProfileSelect = async (profileId: string) => {
    try {
      await profileManager.setActiveProfile(profileId);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to set active profile:', error);
    }
  };

  const handleProfileCreate = () => {
    setEditingProfile(null);
    setEditDialogOpen(true);
  };

  const handleProfileEdit = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    setEditingProfile(profile || null);
    setEditDialogOpen(true);
  };

  const handleProfileDelete = async (profileId: string) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      try {
        await profileManager.deleteProfile(profileId);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to delete profile:', error);
      }
    }
  };

  const handleProfileExport = async (profileId: string) => {
    try {
      const jsonData = await profileManager.exportProfile(profileId);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-${profileId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export profile:', error);
    }
  };

  const handleProfileImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          await profileManager.importProfile(text);
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Failed to import profile:', error);
          alert('Failed to import profile. Please check the file format.');
        }
      }
    };
    input.click();
  };

  const handleProfileSave = async (profile: Profile) => {
    try {
      await profileManager.saveProfile(profile);
      setEditDialogOpen(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleProfileChange = (updatedProfile: Profile) => {
    setActiveProfile(updatedProfile);
    setHasUnsavedChanges(true);
  };

  const handlePreferencesChange = (preferences: any) => {
    if (activeProfile) {
      const updatedProfile = { ...activeProfile, preferences };
      setActiveProfile(updatedProfile);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    if (activeProfile) {
      try {
        await profileManager.saveProfile(activeProfile);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to save changes:', error);
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all changes?')) {
      // Reload the active profile from the manager
      const current = profileManager.getActiveProfile();
      setActiveProfile(current);
      setHasUnsavedChanges(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
            )}
            <Button variant="outline" onClick={handleReset} disabled={!hasUnsavedChanges}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Selector */}
      <div className="border-b p-4">
        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfile?.id || ''}
          onSelect={handleProfileSelect}
          onCreate={handleProfileCreate}
          onEdit={handleProfileEdit}
          onDelete={handleProfileDelete}
          onExport={handleProfileExport}
          onImport={handleProfileImport}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/50 overflow-y-auto">
          <div className="p-4">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="providers" className="justify-start">
                  Providers
                </TabsTrigger>
                <TabsTrigger value="preferences" className="justify-start">
                  Preferences
                </TabsTrigger>
                <TabsTrigger value="features" className="justify-start">
                  Features
                </TabsTrigger>
                <TabsTrigger value="advanced" className="justify-start">
                  Advanced
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsContent value="providers" className="mt-0">
              <ProvidersSettings
                profile={activeProfile}
                onChange={handleProfileChange}
              />
            </TabsContent>
            <TabsContent value="preferences" className="mt-0">
              <AdvancedSettings
                preferences={activeProfile?.preferences || DEFAULT_USER_PREFERENCES}
                onChange={handlePreferencesChange}
              />
            </TabsContent>
            <TabsContent value="features" className="mt-0">
              <FeaturesSettings />
            </TabsContent>
            <TabsContent value="advanced" className="mt-0">
              <AdvancedSettings
                preferences={activeProfile?.preferences || DEFAULT_USER_PREFERENCES}
                onChange={handlePreferencesChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        profile={editingProfile}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleProfileSave}
      />
    </div>
  );
};
