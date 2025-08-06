import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { Layout } from "@/components/layout/Layout";
import { EntryForm } from "@/components/entries/EntryForm";
import { EntriesView } from "@/components/entries/EntriesView";
import { CategoriesView } from "@/components/categories/CategoriesView";
import { InsightsView } from "@/components/insights/InsightsView";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"entries" | "categories" | "insights">("entries");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [refreshEntries, setRefreshEntries] = useState(false);
  const [refreshInsights, setRefreshInsights] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleEntryCreated = () => {
    setShowEntryForm(false);
    setRefreshEntries(!refreshEntries);
  };

  const handleGenerateInsights = () => {
    setRefreshInsights(!refreshInsights);
    setActiveTab("insights");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  if (showEntryForm) {
    return (
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewEntry={() => setShowEntryForm(true)}
        onGenerateInsights={handleGenerateInsights}
      >
        <EntryForm
          onEntryCreated={handleEntryCreated}
          onCancel={() => setShowEntryForm(false)}
        />
      </Layout>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onNewEntry={() => setShowEntryForm(true)}
      onGenerateInsights={handleGenerateInsights}
    >
      {activeTab === "entries" && (
        <EntriesView key={refreshEntries.toString()} />
      )}
      {activeTab === "categories" && <CategoriesView />}
      {activeTab === "insights" && (
        <InsightsView
          shouldRefresh={refreshInsights}
          onRefreshComplete={() => setRefreshInsights(false)}
        />
      )}
    </Layout>
  );
};

export default Index;
