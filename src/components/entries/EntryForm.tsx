import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EntryFormProps {
  onEntryCreated: () => void;
  onCancel: () => void;
}

export const EntryForm = ({ onEntryCreated, onCancel }: EntryFormProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call AI categorization function
      const { data: aiResponse } = await supabase.functions.invoke('categorize-entry', {
        body: { content }
      });

      if (aiResponse?.error) {
        throw new Error(aiResponse.error);
      }

      const { categoryName, reasoning } = aiResponse;

      // Create or get category
      let categoryId = null;
      if (categoryName) {
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', categoryName)
          .single();

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const { data: newCategory } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: categoryName,
              description: `Auto-created category for ${categoryName}`,
            })
            .select('id')
            .single();

          if (newCategory) {
            categoryId = newCategory.id;
          }
        }
      }

      // Create entry
      const { error } = await supabase
        .from('entries')
        .insert({
          user_id: user.id,
          original_input: content,
          content,
          category_id: categoryId,
          ai_reasoning: reasoning,
        });

      if (error) throw error;

      toast({
        title: "Entry created!",
        description: categoryName 
          ? `Categorized as: ${categoryName}`
          : "Entry saved successfully.",
      });

      onEntryCreated();
      setContent("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Thought</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind? Type anything - a thought, idea, plan, or reflection..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-32"
            required
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !content.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Entry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};