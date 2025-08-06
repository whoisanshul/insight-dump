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
    const { content } = await req.json();
    
    if (!content?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

    // Try OpenAI first, fallback to Claude
    let aiResponse;
    
    if (openAIApiKey) {
      console.log('Using OpenAI for categorization');
      aiResponse = await callOpenAI(openAIApiKey, content);
    } else if (claudeApiKey) {
      console.log('Using Claude for categorization');
      aiResponse = await callClaude(claudeApiKey, content);
    } else {
      throw new Error('No AI API keys configured');
    }

    return new Response(
      JSON.stringify(aiResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in categorize-entry function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callOpenAI(apiKey: string, content: string) {
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
          content: `You are an intelligent categorization assistant. Analyze the user's thought/entry and suggest the most appropriate category. Categories should be simple, broad themes like: Gym, Job Hunt, Travel Ideas, Personal Growth, Health, Work, Relationships, Hobbies, Goals, etc.

Return a JSON response with:
- categoryName: A short, descriptive category name (or null if unclear)
- reasoning: Brief explanation of why this category was chosen

Keep categories general and reusable. If the content doesn't fit any clear category, return null for categoryName.`
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.3,
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
    return {
      categoryName: null,
      reasoning: "Could not parse AI response"
    };
  }
}

async function callClaude(apiKey: string, content: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are an intelligent categorization assistant. Analyze this thought/entry and suggest the most appropriate category: "${content}"

Categories should be simple, broad themes like: Gym, Job Hunt, Travel Ideas, Personal Growth, Health, Work, Relationships, Hobbies, Goals, etc.

Return a JSON response with:
- categoryName: A short, descriptive category name (or null if unclear)
- reasoning: Brief explanation of why this category was chosen

Keep categories general and reusable. If the content doesn't fit any clear category, return null for categoryName.`
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
    return {
      categoryName: null,
      reasoning: "Could not parse AI response"
    };
  }
}