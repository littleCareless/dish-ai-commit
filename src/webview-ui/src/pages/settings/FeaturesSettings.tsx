import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Code, MessageSquare, BarChart3, GitCommit } from 'lucide-react';

export const FeaturesSettings: React.FC = () => {
  const [features, setFeatures] = useState({
    codeIndexing: true,
    commitChat: true,
    weeklyReport: false,
    autoCommit: false,
  });

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: enabled,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Feature Settings</h2>
        <p className="text-muted-foreground mb-4">
          Enable or disable various features of the extension.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Code Indexing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Code Indexing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label htmlFor="code-indexing">Enable Code Indexing</Label>
                <p className="text-sm text-muted-foreground">
                  Index your codebase for better AI suggestions and context awareness.
                </p>
              </div>
              <Switch
                checked={features.codeIndexing}
                onCheckedChange={(enabled: boolean) => handleFeatureToggle('codeIndexing', enabled)}
              />
            </div>
            {features.codeIndexing && (
              <div className="pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Index file types:</Label>
                  <Badge variant="outline">JavaScript</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">Python</Badge>
                  <Badge variant="outline">Go</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically index common programming languages in your workspace.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commit Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Commit Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label htmlFor="commit-chat">Enable Commit Chat</Label>
                <p className="text-sm text-muted-foreground">
                  Chat with AI about your commits and get suggestions for improvements.
                </p>
              </div>
              <Switch
                checked={features.commitChat}
                onCheckedChange={(enabled: boolean) => handleFeatureToggle('commitChat', enabled)}
              />
            </div>
            {features.commitChat && (
              <div className="pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Chat features:</Label>
                  <Badge variant="outline">Commit Analysis</Badge>
                  <Badge variant="outline">Code Review</Badge>
                  <Badge variant="outline">Suggestions</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get AI-powered insights about your commits and code changes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Weekly Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label htmlFor="weekly-report">Enable Weekly Report</Label>
                <p className="text-sm text-muted-foreground">
                  Generate weekly reports about your coding activity and productivity.
                </p>
              </div>
              <Switch
                checked={features.weeklyReport}
                onCheckedChange={(enabled: boolean) => handleFeatureToggle('weeklyReport', enabled)}
              />
            </div>
            {features.weeklyReport && (
              <div className="pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Report includes:</Label>
                  <Badge variant="outline">Commit Stats</Badge>
                  <Badge variant="outline">Code Metrics</Badge>
                  <Badge variant="outline">Productivity</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Receive weekly summaries of your coding activity and achievements.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto Commit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              Auto Commit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label htmlFor="auto-commit">Enable Auto Commit</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate and apply commit messages for your changes.
                </p>
              </div>
              <Switch
                checked={features.autoCommit}
                onCheckedChange={(enabled: boolean) => handleFeatureToggle('autoCommit', enabled)}
              />
            </div>
            {features.autoCommit && (
              <div className="pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Auto commit features:</Label>
                  <Badge variant="outline">Smart Messages</Badge>
                  <Badge variant="outline">Change Detection</Badge>
                  <Badge variant="outline">Batch Commits</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically generate meaningful commit messages based on your changes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Feature Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Code Indexing</span>
              <Badge variant={features.codeIndexing ? 'default' : 'secondary'}>
                {features.codeIndexing ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Commit Chat</span>
              <Badge variant={features.commitChat ? 'default' : 'secondary'}>
                {features.commitChat ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Weekly Report</span>
              <Badge variant={features.weeklyReport ? 'default' : 'secondary'}>
                {features.weeklyReport ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto Commit</span>
              <Badge variant={features.autoCommit ? 'default' : 'secondary'}>
                {features.autoCommit ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
