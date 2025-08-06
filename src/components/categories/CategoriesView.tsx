import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  entry_count: number;
}

export const CategoriesView = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });
  const { toast } = useToast();

  const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#F97316", "#06B6D4", "#84CC16", "#EC4899", "#6B7280"
  ];

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          description,
          color,
          entries (count)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      setCategories(data.map(cat => ({
        ...cat,
        entry_count: cat.entries?.[0]?.count || 0
      })));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Category updated!" });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            ...formData,
            user_id: user.id,
          });

        if (error) throw error;
        toast({ title: "Category created!" });
      }

      setFormData({ name: "", description: "", color: "#3B82F6" });
      setEditingId(null);
      setShowNewForm(false);
      fetchCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
    }
  };

  const startEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color,
    });
    setEditingId(category.id);
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.filter(cat => cat.id !== id));
      toast({ title: "Category deleted" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      {(showNewForm || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Category" : "New Category"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Category name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewForm(false);
                    setEditingId(null);
                    setFormData({ name: "", description: "", color: "#3B82F6" });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {category.entry_count} entries
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(category)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategory(category.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {category.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {categories.length === 0 && !showNewForm && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No categories yet. Categories will be created automatically as you add entries, or you can create them manually.</p>
        </div>
      )}
    </div>
  );
};