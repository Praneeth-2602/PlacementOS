import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Account preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Profile and notification settings will expand in later phases.</p>
      </CardContent>
    </Card>
  );
}
