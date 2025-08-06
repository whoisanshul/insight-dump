import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Entry {
  id: string;
  content: string;
  original_input: string;
  ai_reasoning: string | null;
  created_at: string;
  category: {
    name: string;
    color: string;
  } | null;
}

export const EntriesView = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('entries')
        .select(`
          id,
          content,
          original_input,
          ai_reasoning,
          created_at,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEntries(data.map(entry => ({
        ...entry,
        category: entry.categories
      })));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(entries.filter(entry => entry.id !== id));
      toast({
        title: "Entry deleted",
        description: "The entry has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading entries...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No entries yet. Start by adding your first thought!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {entry.category && (
                  <Badge 
                    variant="secondary"
                    style={{ backgroundColor: `${entry.category.color}20`, color: entry.category.color }}
                  >
                    {entry.category.name}
                  </Badge>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteEntry(entry.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground mb-3">{entry.content}</p>
            {entry.ai_reasoning && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>AI Analysis:</strong> {entry.ai_reasoning}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};