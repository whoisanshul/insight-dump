import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Clock, CheckSquare, Target, Calendar, TrendingUp, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface GeneratedInsight {
  type: 'insight' | 'action' | 'suggestion' | 'habit' | 'pattern';
  title: string;
  content: string;
  priority?: 'high' | 'medium' | 'low';
  category?: {
    name: string;
    color: string;
  };
}

interface InsightsViewProps {
  shouldRefresh: boolean;
  onRefreshComplete: () => void;
}

export const InsightsView = ({ shouldRefresh, onRefreshComplete }: InsightsViewProps) => {
  const [insights, setInsights] = useState<GeneratedInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const { toast } = useToast();

  const generateRealTimeInsights = async (insightType: string = 'general') => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { type: insightType }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInsights(data.insights || []);
      toast({
        title: "Insights refreshed!",
        description: `Generated ${data.insights?.length || 0} new insights.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate insights",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    generateRealTimeInsights(tab);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  useEffect(() => {
    generateRealTimeInsights('insights');
  }, []);

  useEffect(() => {
    if (shouldRefresh) {
      generateRealTimeInsights(activeTab);
      onRefreshComplete();
    }
  }, [shouldRefresh]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Dashboard</h2>
        <Button onClick={() => generateRealTimeInsights(activeTab)} disabled={generating}>
          {generating ? (
            <TrendingUp className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          {generating ? "Generating..." : "Refresh Insights"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Habits
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Patterns
          </TabsTrigger>
        </TabsList>

        {['insights', 'actions', 'suggestions', 'habits', 'patterns'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {loading || generating ? (
              <div className="text-center py-12">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-4 animate-pulse" />
                <p className="text-muted-foreground">Generating fresh {tab}...</p>
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 mx-auto text-muted-foreground mb-4 flex items-center justify-center">
                  {tab === 'insights' && <Lightbulb className="h-8 w-8" />}
                  {tab === 'actions' && <CheckSquare className="h-8 w-8" />}
                  {tab === 'suggestions' && <Target className="h-8 w-8" />}
                  {tab === 'habits' && <TrendingUp className="h-8 w-8" />}
                  {tab === 'patterns' && <Calendar className="h-8 w-8" />}
                </div>
                <p className="text-muted-foreground">
                  No {tab} available. Click refresh to generate new ones!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <Card key={`${tab}-${index}`} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {insight.priority && (
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                          )}
                          {insight.category && (
                            <Badge 
                              variant="secondary"
                              style={{ backgroundColor: `${insight.category.color}20`, color: insight.category.color }}
                            >
                              {insight.category.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Fresh • Just generated
                        </div>
                      </div>
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed">{insight.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};