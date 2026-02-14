/**
 * Profile 批量操作组件
 * 提供批量导出、删除等功能
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Download, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Profile } from "../../types/settings";
import { showInformationMessage } from "../../utils/vscode";

interface ProfileBulkActionsProps {
  profiles: Profile[];
  onBulkExport: (profileIds: string[]) => void;
  onBulkDelete: (profileIds: string[]) => void;
  className?: string;
}

export const ProfileBulkActions: React.FC<ProfileBulkActionsProps> = ({
  profiles,
  onBulkExport,
  onBulkDelete,
  className = "",
}) => {
  const { t } = useTranslation("profile-settings");
  const { t: tCommon } = useTranslation("common");
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(
    new Set(),
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSelectProfile = (profileId: string, checked: boolean) => {
    const newSelected = new Set(selectedProfiles);
    if (checked) {
      newSelected.add(profileId);
    } else {
      newSelected.delete(profileId);
    }
    setSelectedProfiles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProfiles(new Set(profiles.map((p) => p.id)));
    } else {
      setSelectedProfiles(new Set());
    }
  };

  const handleBulkExport = () => {
    if (selectedProfiles.size === 0) {
      showInformationMessage(t("selectProfileToOperate"));
      return;
    }
    onBulkExport(Array.from(selectedProfiles));
    setSelectedProfiles(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedProfiles.size === 0) {
      showInformationMessage(t("selectProfileToOperate"));
      return;
    }
    setShowDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    onBulkDelete(Array.from(selectedProfiles));
    setSelectedProfiles(new Set());
    setShowDeleteDialog(false);
  };

  const selectedCount = selectedProfiles.size;
  const allSelected = selectedCount === profiles.length && profiles.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < profiles.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 批量操作控制 */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedCount > 0
              ? t("selectedCount", { count: selectedCount })
              : t("selectProfileToOperate")}
          </span>
        </div>

        {selectedCount > 0 && (
          <div className="flex space-x-2">
            <Button onClick={handleBulkExport} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              {t("bulkExport")}
            </Button>
            <Button onClick={handleBulkDelete} size="sm" variant="destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              {t("bulkDelete")}
            </Button>
          </div>
        )}
      </div>

      {/* Profile 列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-muted/50"
          >
            <Checkbox
              checked={selectedProfiles.has(profile.id)}
              onCheckedChange={(checked) =>
                handleSelectProfile(profile.id, checked as boolean)
              }
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {profile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Object.keys(profile.providers).length} providers
                </span>
              </div>
              {profile.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {profile.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmBulkDelete")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("deleteConfirmation", { count: selectedCount })}
              </AlertDescription>
            </Alert>

            <div className="max-h-32 overflow-y-auto">
              <p className="text-sm font-medium mb-2">
                {t("profilesToDelete")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {Array.from(selectedProfiles).map((profileId) => {
                  const profile = profiles.find((p) => p.id === profileId);
                  return profile ? (
                    <li
                      key={profileId}
                      className="flex items-center justify-between"
                    >
                      <span>{profile.name}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              {tCommon("actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
