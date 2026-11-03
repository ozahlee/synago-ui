import { Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, PersonAvatar } from "@/components/page"

type RecentActivitiesProps = {
  activities: Array<{ id: string; name: string; action: string; time: string }>
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>New members and recent gifts</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <EmptyState icon={Activity} title="Nothing yet" description="New members and gifts will appear here." className="py-8" />
        ) : (
          <ol className="relative space-y-5 before:absolute before:inset-y-2 before:left-[17px] before:w-px before:bg-border">
            {activities.map((activity) => (
              <li key={activity.id} className="relative flex items-start gap-4">
                <PersonAvatar name={activity.name} className="ring-4 ring-card" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm">
                    <span className="font-semibold">{activity.name}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
