import { Sidebar, MobileTopBar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { FeedbackFab } from "./FeedbackFab";
import { KlassenzimmerPanel } from "./KlassenzimmerPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {children}
        </main>
        <MobileTabBar />
      </div>
      <KlassenzimmerPanel />
      <FeedbackFab />
    </div>
  );
}
