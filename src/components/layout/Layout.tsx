import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Lightbulb, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
  activeTab: "entries" | "categories" | "insights";
  onTabChange: (tab: "entries" | "categories" | "insights") => void;
  onNewEntry: () => void;
  onGenerateInsights: () => void;
}

export const Layout = ({ 
  children, 
  activeTab, 
  onTabChange, 
  onNewEntry, 
  onGenerateInsights 
}: LayoutProps) => {
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Personal Thought Organizer</h1>
            <div className="flex items-center gap-2">
              <Button onClick={onNewEntry} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
              <Button onClick={onGenerateInsights} variant="outline" size="sm">
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <Button
              variant={activeTab === "entries" ? "default" : "ghost"}
              onClick={() => onTabChange("entries")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Entries
            </Button>
            <Button
              variant={activeTab === "categories" ? "default" : "ghost"}
              onClick={() => onTabChange("categories")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Categories
            </Button>
            <Button
              variant={activeTab === "insights" ? "default" : "ghost"}
              onClick={() => onTabChange("insights")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};