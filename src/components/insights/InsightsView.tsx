import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Clock, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Insight {
  id: string;
  insight_text: string;
  action_plan: string | null;
  generated_at: string;
  category: {
    name: string;
    color: string;
  } | null;
}

interface InsightsViewProps {
  shouldRefresh: boolean;
  onRefreshComplete: () => void;
}

export const InsightsView = ({ shouldRefresh, onRefreshComplete }: InsightsViewProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('insights')
        .select(`
          id,
          insight_text,
          action_plan,
          generated_at,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;

      setInsights(data.map(insight => ({
        ...insight,
        category: insight.categories
      })));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Insights generated!",
        description: `Generated ${data.insights?.length || 0} new insights.`,
      });

      fetchInsights();
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

  const deleteInsight = async (id: string) => {
    try {
      const { error } = await supabase
        .from('insights')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInsights(insights.filter(insight => insight.id !== id));
      toast({
        title: "Insight deleted",
        description: "The insight has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete insight",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  useEffect(() => {
    if (shouldRefresh) {
      generateInsights();
      onRefreshComplete();
    }
  }, [shouldRefresh]);

  if (loading) {
    return <div className="text-center py-8">Loading insights...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Insights</h2>
        <Button onClick={generateInsights} disabled={generating}>
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Lightbulb className="h-4 w-4 mr-2" />
          )}
          {generating ? "Generating..." : "Generate New Insights"}
        </Button>
      </div>

      {insights.length === 0 && !generating && (
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No insights yet. Generate your first insights from your entries!
          </p>
        </div>
      )}

      <div className="space-y-4">
        {insights.map((insight) => (
          <Card key={insight.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  {insight.category && (
                    <Badge 
                      variant="secondary"
                      style={{ backgroundColor: `${insight.category.color}20`, color: insight.category.color }}
                    >
                      {insight.category.name}
                    </Badge>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(insight.generated_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteInsight(insight.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Insight</h4>
                  <p className="text-foreground">{insight.insight_text}</p>
                </div>
                {insight.action_plan && (
                  <div className="bg-muted p-3 rounded-md">
                    <h4 className="font-medium text-foreground mb-2">Action Plan</h4>
                    <p className="text-muted-foreground">{insight.action_plan}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};