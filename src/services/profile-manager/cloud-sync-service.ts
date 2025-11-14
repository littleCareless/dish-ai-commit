import { ProviderProfileRepository } from "./provider-profile-repository";
import { ProviderProfiles, ProviderSettingsWithId, isSecretStateKey } from "./types";
import deepEqual from "fast-deep-equal";

export interface SyncCloudProfilesResult {
    hasChanges: boolean;
    activeProfileChanged: boolean;
    activeProfileId: string;
}

export class CloudSyncService {
    private readonly repository: ProviderProfileRepository;

    constructor(repository: ProviderProfileRepository) {
        this.repository = repository;
    }

    public async syncCloudProfiles(
        cloudProfiles: Record<string, ProviderSettingsWithId>,
        currentActiveProfileName?: string,
    ): Promise<SyncCloudProfilesResult> {
        return this.repository.lock(async () => {
            const providerProfiles = await this.repository.load();
            const changedProfiles: string[] = [];
            const existingNames = new Set(Object.keys(providerProfiles.apiConfigs));

            let activeProfileChanged = false;
            let activeProfileId = "";

            if (currentActiveProfileName && providerProfiles.apiConfigs[currentActiveProfileName]) {
                activeProfileId = providerProfiles.apiConfigs[currentActiveProfileName].id || "";
            }

            const currentCloudIds = new Set(providerProfiles.cloudProfileIds || []);
            const newCloudIds = new Set(
                Object.values(cloudProfiles)
                    .map((p) => p.id)
                    .filter((id): id is string => Boolean(id)),
            );

            // Step 1: Delete profiles that are cloud-managed but not in the new cloud profiles
            for (const [name, profile] of Object.entries(providerProfiles.apiConfigs) as [string, ProviderSettingsWithId][]) {
                if (profile.id && currentCloudIds.has(profile.id) && !newCloudIds.has(profile.id)) {
                    if (name === currentActiveProfileName) {
                        activeProfileChanged = true;
                        activeProfileId = "";
                    }
                    delete providerProfiles.apiConfigs[name];
                    changedProfiles.push(name);
                    existingNames.delete(name);
                }
            }

            // Step 2: Process each cloud profile
            for (const [cloudName, cloudProfile] of Object.entries(cloudProfiles)) {
                if (!cloudProfile.id) {
                    continue;
                }

                const existingEntry = (Object.entries(providerProfiles.apiConfigs) as [string, ProviderSettingsWithId][]).find(
                    ([_, profile]) => profile.id === cloudProfile.id,
                );

                if (existingEntry) {
                    // Step 3: Update existing profile
                    const [existingName, existingProfile] = existingEntry;
                    const isActiveProfile = existingName === currentActiveProfileName;
                    const updatedProfile: ProviderSettingsWithId = { ...cloudProfile };

                    for (const [key, value] of Object.entries(existingProfile as any)) {
                        if (isSecretStateKey(key) && value !== undefined) {
                            (updatedProfile as any)[key] = value;
                        }
                    }

                    const profileChanged = !deepEqual(existingProfile, updatedProfile);

                    if (existingName !== cloudName) {
                        delete providerProfiles.apiConfigs[existingName];
                        existingNames.delete(existingName);

                        let finalName = cloudName;
                        if (existingNames.has(cloudName)) {
                            const conflictingProfile = providerProfiles.apiConfigs[cloudName];
                            if (conflictingProfile.id !== cloudProfile.id) {
                                const newName = this.findUniqueProfileName(cloudName, existingNames);
                                providerProfiles.apiConfigs[newName] = conflictingProfile;
                                existingNames.add(newName);
                                changedProfiles.push(newName);
                            }
                            delete providerProfiles.apiConfigs[cloudName];
                            existingNames.delete(cloudName);
                        }

                        providerProfiles.apiConfigs[finalName] = updatedProfile;
                        existingNames.add(finalName);
                        changedProfiles.push(finalName);
                        if (existingName !== finalName) {
                            changedProfiles.push(existingName);
                        }

                        if (isActiveProfile) {
                            activeProfileChanged = true;
                            activeProfileId = cloudProfile.id || "";
                        }
                    } else if (profileChanged) {
                        providerProfiles.apiConfigs[existingName] = updatedProfile;
                        changedProfiles.push(existingName);

                        if (isActiveProfile) {
                            activeProfileChanged = true;
                            activeProfileId = cloudProfile.id || "";
                        }
                    }
                } else {
                    // Step 4: Add new cloud profile
                    let finalName = cloudName;

                    if (existingNames.has(cloudName)) {
                        const existingProfile = providerProfiles.apiConfigs[cloudName];
                        if (existingProfile.id !== cloudProfile.id) {
                            const newName = this.findUniqueProfileName(cloudName, existingNames);
                            providerProfiles.apiConfigs[newName] = existingProfile;
                            existingNames.add(newName);
                            changedProfiles.push(newName);
                            delete providerProfiles.apiConfigs[cloudName];
                            existingNames.delete(cloudName);
                        }
                    }

                    const newProfile: ProviderSettingsWithId = { ...cloudProfile };
                    for (const key of Object.keys(newProfile)) {
                        if (isSecretStateKey(key)) {
                            delete (newProfile as any)[key];
                        }
                    }

                    providerProfiles.apiConfigs[finalName] = newProfile;
                    existingNames.add(finalName);
                    changedProfiles.push(finalName);
                }
            }

            // Step 5: Handle case where all profiles might be deleted
            if (Object.keys(providerProfiles.apiConfigs).length === 0 && changedProfiles.length > 0) {
                const defaultProfile = { id: Math.random().toString(36).substring(2, 15) };
                providerProfiles.apiConfigs["default"] = defaultProfile;
                activeProfileChanged = true;
                activeProfileId = defaultProfile.id || "";
                changedProfiles.push("default");
            }

            // Step 6: If active profile was deleted, find a replacement
            if (activeProfileChanged && !activeProfileId) {
                const firstProfile = Object.values(providerProfiles.apiConfigs)[0] as ProviderSettingsWithId | undefined;
                if (firstProfile?.id) {
                    activeProfileId = firstProfile.id;
                }
            }

            // Step 7: Update cloudProfileIds
            providerProfiles.cloudProfileIds = Array.from(newCloudIds);

            await this.repository.store(providerProfiles);

            return {
                hasChanges: changedProfiles.length > 0,
                activeProfileChanged,
                activeProfileId,
            };
        });
    }

    private findUniqueProfileName(baseName: string, existingNames: Set<string>): string {
        if (!existingNames.has(baseName)) {
            return baseName;
        }

        const localName = `${baseName}_local`;
        if (!existingNames.has(localName)) {
            return localName;
        }

        let counter = 1;
        let candidateName: string;
        do {
            candidateName = `${baseName}_${counter}`;
            counter++;
        } while (existingNames.has(candidateName));

        return candidateName;
    }
}