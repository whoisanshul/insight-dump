import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Fetch recent entries
    const { data: entries, error: entriesError } = await supabaseClient
      .from('entries')
      .select(`
        id,
        content,
        original_input,
        created_at,
        categories (
          id,
          name,
          color
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (entriesError) throw entriesError;

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ insights: [], message: 'No entries found to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate insights using AI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

    let insights;
    if (openAIApiKey) {
      console.log('Using OpenAI for insights generation');
      insights = await generateInsightsWithOpenAI(openAIApiKey, entries);
    } else if (claudeApiKey) {
      console.log('Using Claude for insights generation');
      insights = await generateInsightsWithClaude(claudeApiKey, entries);
    } else {
      throw new Error('No AI API keys configured');
    }

    // Save insights to database
    const savedInsights = [];
    for (const insight of insights) {
      const { data: savedInsight, error: saveError } = await supabaseClient
        .from('insights')
        .insert({
          user_id: user.id,
          insight_text: insight.insight_text,
          action_plan: insight.action_plan,
          category_id: insight.category_id,
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving insight:', saveError);
      } else {
        savedInsights.push(savedInsight);
      }
    }

    return new Response(
      JSON.stringify({ insights: savedInsights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-insights function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateInsightsWithOpenAI(apiKey: string, entries: any[]) {
  const entriesText = entries.map(entry => 
    `[${entry.created_at}] ${entry.categories?.name ? `(${entry.categories.name})` : ''} ${entry.content}`
  ).join('\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: `You are an insightful AI analyst. Analyze these personal journal entries and provide meaningful insights about patterns, trends, or recommendations.

Generate 3-5 insights in JSON format:
[
  {
    "insight_text": "A meaningful observation or pattern you noticed",
    "action_plan": "Specific, actionable suggestions based on this insight",
    "category_id": null
  }
]

Focus on:
- Behavioral patterns
- Goal progress
- Emotional trends
- Life balance
- Growth opportunities

Be encouraging, constructive, and specific.`
        },
        {
          role: 'user',
          content: `Here are my recent journal entries:\n\n${entriesText}`
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.choices[0].message.content;
  
  try {
    return JSON.parse(result);
  } catch {
    // Fallback if JSON parsing fails
    return [{
      insight_text: "Unable to generate structured insights at this time.",
      action_plan: null,
      category_id: null
    }];
  }
}

async function generateInsightsWithClaude(apiKey: string, entries: any[]) {
  const entriesText = entries.map(entry => 
    `[${entry.created_at}] ${entry.categories?.name ? `(${entry.categories.name})` : ''} ${entry.content}`
  ).join('\n\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are an insightful AI analyst. Analyze these personal journal entries and provide meaningful insights about patterns, trends, or recommendations.

Here are the entries:
${entriesText}

Generate 3-5 insights in this exact JSON format:
[
  {
    "insight_text": "A meaningful observation or pattern you noticed",
    "action_plan": "Specific, actionable suggestions based on this insight",
    "category_id": null
  }
]

Focus on:
- Behavioral patterns
- Goal progress  
- Emotional trends
- Life balance
- Growth opportunities

Be encouraging, constructive, and specific.`
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.content[0].text;
  
  try {
    return JSON.parse(result);
  } catch {
    // Fallback if JSON parsing fails
    return [{
      insight_text: "Unable to generate structured insights at this time.",
      action_plan: null,
      category_id: null
    }];
  }
}