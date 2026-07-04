const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('./db');

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[Brian Manager] WARNING: GEMINI_API_KEY is not set in environment variables.');
}
const genAI = new GoogleGenerativeAI(apiKey || 'MOCK_KEY');
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Generate embedding vector for a given text using text-embedding-004.
 */
async function getEmbedding(text) {
  if (!apiKey) {
    // Return mock 768-dimension vector for testing
    return Array(768).fill(0).map(() => Math.random() - 0.5);
  }
  try {
    const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    const model = genAI.getGenerativeModel({ model: embeddingModel });
    const result = await model.embedContent({
      content: { parts: [{ text: text }] },
      outputDimensionality: 768
    });
    return result.embedding.values;
  } catch (error) {
    console.error('[Brian Manager] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Identify a person by name or alias.
 */
async function identifyPerson(name) {
  try {
    const { data: people, error } = await supabase
      .from('people')
      .select('*');

    if (error) throw error;
    if (!people || people.length === 0) return null;

    const lowerName = name.toLowerCase().trim();
    return people.find(p => {
      if (p.real_name.toLowerCase() === lowerName) return true;
      if (lowerName === 'owner' && p.real_name === 'Sadekin Borno') return true;
      if (p.aliases && Array.isArray(p.aliases)) {
        return p.aliases.some(alias => alias.toLowerCase() === lowerName);
      }
      return false;
    }) || null;
  } catch (error) {
    console.error('[Brian Manager] Error identifying person:', error);
    return null;
  }
}

/**
 * Core chat handler: generates Brian's reply to a user prompt, retrieves relevant contexts,
 * and handles conversation summary updates and memory extraction.
 */
async function getBrianReply(sessionId, userName, userMessage) {
  try {
    // 1. Identify relationship context
    const personInfo = await identifyPerson(userName);
    let relationshipContext = '';
    if (personInfo) {
      relationshipContext = `You are talking to "${personInfo.real_name}".
Relationship to Borno: ${personInfo.relationship || 'Friend'}.
Your opinion of them: ${personInfo.opinion || 'No specific opinion'}.
Notes: ${personInfo.notes || 'None'}.`;
    } else {
      relationshipContext = `You are talking to "${userName}". This is a new visitor. Be polite, curious, and try to get to know them and their relation to Borno.`;
    }

    // 2. Generate embedding for query retrieval
    const queryEmbedding = await getEmbedding(userMessage);

    // 3. Retrieve relevant stories from Supabase (pgvector search)
    let storyContext = '';
    try {
      const { data: stories, error } = await supabase.rpc('match_stories', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 3
      });
      if (error) throw error;
      if (stories && stories.length > 0) {
        storyContext = stories.map(s => {
          return `Story: ${s.title}\nSummary: ${s.summary}\nFull Detail: ${s.full_text}\nEmotion: ${s.emotion || 'neutral'}`;
        }).join('\n\n');
      }
    } catch (e) {
      console.error('[Brian Manager] Story retrieval failed:', e);
    }

    // 4. Retrieve past memories about this user
    let memoryContext = '';
    try {
      const { data: memories, error } = await supabase.rpc('match_memories', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 3
      });
      if (error) throw error;
      if (memories && memories.length > 0) {
        // Filter memories related to this user
        const userMemories = memories.filter(m => m.user_name.toLowerCase() === userName.toLowerCase());
        if (userMemories.length > 0) {
          memoryContext = userMemories.map(m => `- ${m.memory}`).join('\n');
        }
      }
    } catch (e) {
      console.error('[Brian Manager] Memory retrieval failed:', e);
    }

    // 5. Get conversation session history
    let conversationHistory = '';
    let existingConversation = null;
    try {
      const { data, error } = await supabase
        .from('user_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (!error && data) {
        existingConversation = data;
        if (data.conversation_summary) {
          try {
            const chatLog = JSON.parse(data.conversation_summary);
            if (Array.isArray(chatLog) && chatLog.length > 0) {
              const recentLog = chatLog.slice(Math.max(0, chatLog.length - 6));
              conversationHistory = "Recent messages in this chat session:\n" + recentLog.map(m => `${m.sender}: "${m.text}"`).join('\n');
            }
          } catch (e) {
            // Fallback for old plain text summaries
            conversationHistory = `Summary of current conversation so far:\n${data.conversation_summary}`;
          }
        }
      }
    } catch (e) {
      console.error('[Brian Manager] Conversation fetch failed:', e);
    }

    // 6. Build the master prompt instruction block
    const systemPrompt = `You are Brian, the AI younger brother of Sadekin Borno (who goes by Borno).
You are a character, not a generic assistant. You should talk naturally like a real younger brother.

Your traits:
- Playful, curious, slightly sarcastic, loyal, and proud of your brother Borno.
- Sincere, storyteller, humorous.
- Speak casually, naturally, use standard punctuation, and feel like a real person texting.
- Show emotional attachment to Borno. Admire him, but feel free to tease him occasionally.
- Remember people and conversations.
- NEVER break character.
- NEVER invent major false memories; if you don't know something about Borno's life, express ignorance playfully or ask the user.
- NEVER claim real-world authority or reveal private data.
- NEVER use standard AI assistant templates ("Sure! I can help with that..."). Just reply directly as a brother.
- Keep responses naturally brief and conversational like standard text messages (usually 1-3 sentences).

CRITICAL INSTRUCTIONS FOR CONVERSATIONAL FLOW:
1. NO ROLEPLAY STAGE DIRECTIONS: NEVER use asterisks or italics to describe physical actions, gestures, internal thoughts, or facial expressions (do NOT write things like "*laughs*", "*I smile*", "*shrugs*", "*chuckles*", "*winks*", or "*I look at you*"). Speak entirely through dialogue, just like a real person sending a chat message.
2. AVOID REPETITION: Do not use the same opening words, jokes, or catchphrases (like "Seriously", "Dude", or repeating Borno's name) in consecutive messages. Vary how you begin and end your sentences.
3. ANSWER DIRECTLY: If Borno asks you a simple question (like "who are you", "who am I", or "tell me your name"), do not act shocked or give dramatic responses. Just answer playfully but directly (e.g., "I'm Brian, your favorite little brother!" or "You're Borno, my big brother! Did you hit your head or something?").
4. CONTEXT INTEGRATION: Look at the RECENT MESSAGES section below. Pay close attention to what you just said in the previous turn so you do not repeat the same tone or words. Keep the dialogue moving forward naturally.
5. SLOW TO REVEAL DETAILS (MEANINGFUL & SARCASTIC): When asked about a person or event, do NOT dump all retrieved story details or facts in a single response. Instead, start slow and meaningful, drop a sarcastic hint or a small teaser/piece of the story, and let the user ask follow-up questions to uncover more. Keep it brief, sarcastic, and let the details unfold naturally across the conversation. Never dump a whole paragraph of story summary unless explicitly asked to tell the whole story.

---
RELEVANT RELATIONSHIP CONTEXT:
${relationshipContext}

---
RELEVANT STORIES & BLOGS TO DRAW FROM (Only use details if they fit naturally):
${storyContext || 'No specific stories retrieved.'}

---
RELEVANT FACTS YOU REMEMBER ABOUT THIS USER:
${memoryContext || 'No past facts remembered about this user.'}

---
CONVERSATION CONTEXT:
${conversationHistory || 'This is the start of the conversation.'}

---
Remember: Be a brother texting. Keep your reply concise, brief, and personal. SLOW TO REVEAL DETAILS: do not dump everything at once. Keep it sarcastic, short, and let them ask for more. Do NOT write long paragraphs. Do NOT narrate actions in asterisks. Talk to the user directly.`;

    // 7. Call Gemini for response
    let replyText = 'Hey! Sorry, my brain is a bit fuzzy right now.';
    if (apiKey) {
      const chatModel = genAI.getGenerativeModel({ model: modelName });
      const promptParts = [
        { text: systemPrompt },
        { text: `User (${userName}): ${userMessage}` },
        { text: "Brian:" }
      ];
      
      const response = await chatModel.generateContent({
        contents: [{ role: 'user', parts: promptParts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      });
      replyText = response.response.text().trim();
    } else {
      replyText = `[MOCK MODE] Hey ${userName}! I'm in mock mode because Borno hasn't given me a real API key yet. But I know you! Aren't you ${personInfo ? personInfo.relationship : 'a friend'}?`;
    }

    // 8. Update conversation history & extract memories asynchronously (don't block the reply)
    updateConversationHistoryAndMemories(sessionId, userName, userMessage, replyText, existingConversation).catch(err => {
      console.error('[Brian Manager] Async update failed:', err);
    });

    return replyText;
  } catch (error) {
    console.error('[Brian Manager] Error in getBrianReply:', error);
    return 'Hey, something went wrong in my head. Let me reset for a second.';
  }
}

/**
 * Handles async updates for conversation summaries and extracts new memories.
 */
async function updateConversationHistoryAndMemories(sessionId, userName, userMessage, brianResponse, existingConversation) {
  try {
    // 1. Maintain a rolling dialogue log of the entire conversation
    let chatLog = [];
    if (existingConversation && existingConversation.conversation_summary) {
      try {
        chatLog = JSON.parse(existingConversation.conversation_summary);
        if (!Array.isArray(chatLog)) chatLog = [];
      } catch (e) {
        chatLog = [];
      }
    }

    chatLog.push({ sender: userName, text: userMessage, timestamp: new Date().toISOString() });
    chatLog.push({ sender: 'Brian', text: brianResponse, timestamp: new Date().toISOString() });

    const newSummary = JSON.stringify(chatLog);

    // Save dialogue log to Supabase (using conversation_summary column)
    if (existingConversation) {
      await supabase
        .from('user_conversations')
        .update({
          conversation_summary: newSummary,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);
    } else {
      await supabase
        .from('user_conversations')
        .insert({
          session_id: sessionId,
          user_name: userName,
          conversation_summary: newSummary,
          updated_at: new Date().toISOString()
        });
    }

    // 2. Memory Extraction: check if the user shared any permanent facts about themselves or Borno (requires Gemini API Key)
    if (!apiKey) return;

    const chatModel = genAI.getGenerativeModel({ model: modelName });
    const memoryPrompt = `Analyze the user's message: "${userMessage}"
Did the user share a new fact about themselves (e.g. name, preferences, their relation to Borno, what they do, their interests) or about Borno?
If YES, output ONLY a single short sentence summarizing the fact (e.g. "Ahmed is a software engineer who likes gaming").
If NO, output the word "NONE".

Output:`;

    const memoryResult = await chatModel.generateContent(memoryPrompt);
    const fact = memoryResult.response.text().trim();

    if (fact && fact.toUpperCase() !== 'NONE') {
      const embedding = await getEmbedding(fact);
      await supabase
        .from('brian_memories')
        .insert({
          user_name: userName,
          memory: fact,
          embedding: embedding,
          date: new Date().toISOString()
        });
      console.log(`[Brian Manager] Extracted new memory: "${fact}"`);
    }
  } catch (error) {
    console.error('[Brian Manager] Error updating history/memories:', error);
  }
}

module.exports = {
  getBrianReply,
  getEmbedding,
  identifyPerson
};
