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

    const { type = 'general' } = await req.json().catch(() => ({}));

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

    // Generate real-time insights using AI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

    let insights;
    if (openAIApiKey) {
      console.log('Using OpenAI for insights generation');
      insights = await generateInsightsWithOpenAI(openAIApiKey, entries, type);
    } else if (claudeApiKey) {
      console.log('Using Claude for insights generation');
      insights = await generateInsightsWithClaude(claudeApiKey, entries, type);
    } else {
      throw new Error('No AI API keys configured');
    }

    // Return real-time insights without saving to database
    return new Response(
      JSON.stringify({ insights }),
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

async function generateInsightsWithOpenAI(apiKey: string, entries: any[], type: string) {
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
          content: `You are an insightful AI analyst. Analyze these personal journal entries and provide meaningful ${type} based on the user's request.

${getPromptForType(type)}

Generate 3-5 items in JSON format:
[
  {
    "type": "${type}",
    "title": "Brief, engaging title",
    "content": "Detailed content based on the analysis",
    "priority": "high|medium|low" (optional)
  }
]

Be encouraging, constructive, and specific. Focus on actionable content.`
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

async function generateInsightsWithClaude(apiKey: string, entries: any[], type: string) {
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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are an insightful AI analyst. Analyze these personal journal entries and provide meaningful ${type} based on the user's request.

Here are the entries:
${entriesText}

${getPromptForType(type)}

Generate 3-5 items in this exact JSON format:
[
  {
    "type": "${type}",
    "title": "Brief, engaging title", 
    "content": "Detailed content based on the analysis",
    "priority": "high|medium|low" (optional)
  }
]

Be encouraging, constructive, and specific. Focus on actionable content.`
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
      type,
      title: "Analysis Unavailable",
      content: "Unable to generate structured insights at this time. Please try again.",
      priority: "low"
    }];
  }
}

function getPromptForType(type: string): string {
  switch (type) {
    case 'insights':
      return `Focus on deep insights and patterns. Look for:
- Behavioral patterns and trends
- Emotional patterns and triggers  
- Life balance observations
- Personal growth opportunities`;
    
    case 'actions':
      return `Focus on specific, actionable recommendations. Provide:
- Immediate next steps the user can take
- Concrete actions based on their entries
- Time-bound suggestions
- Goal-oriented tasks`;
    
    case 'suggestions':
      return `Focus on helpful suggestions and recommendations. Include:
- Lifestyle improvements
- Habit modifications
- Resource recommendations
- Environmental changes`;
    
    case 'habits':
      return `Focus on habit formation and tracking. Analyze:
- Current habit patterns
- Habit formation opportunities
- Habit stacking possibilities
- Progress tracking suggestions`;
    
    case 'patterns':
      return `Focus on data patterns and calendar insights. Look for:
- Temporal patterns (time of day, days of week)
- Seasonal trends
- Recurring themes
- Calendar-based observations`;
    
    default:
      return `Focus on general insights and observations about the user's journal entries.`;
  }
}