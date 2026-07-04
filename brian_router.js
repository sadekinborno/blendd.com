const express = require('express');
const router = express.Router();
const supabase = require('./db');
const { getBrianReply, getEmbedding } = require('./brian_manager');

/**
 * POST /api/brian/chat
 * Body: { sessionId, userName, message }
 */
router.post('/chat', async (req, res) => {
  const { sessionId, userName, message } = req.body;
  if (!userName || !message) {
    return res.status(400).json({ error: 'Missing userName or message' });
  }

  // Fallback sessionId if not provided
  const activeSessionId = sessionId || 'default-session';

  try {
    const reply = await getBrianReply(activeSessionId, userName, message);
    res.json({ reply });
  } catch (error) {
    console.error('[Brian Router] Chat error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/brian/people
 * Body: { realName, aliases, relationship, opinion, notes }
 * Registers or updates a relationship profile.
 */
router.post('/people', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { realName, aliases, relationship, opinion, notes } = req.body;
  if (!realName) {
    return res.status(400).json({ error: 'Missing realName' });
  }

  try {
    // Check if name already exists case-insensitively to prevent duplicates (e.g., T-dawg vs T-Dawg)
    const { data: existing, error: checkErr } = await supabase
      .from('people')
      .select('id, real_name')
      .ilike('real_name', realName.trim())
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existing) {
      return res.status(400).json({ error: `A relationship profile for "${realName}" already exists.` });
    }

    const cleanAliases = Array.isArray(aliases) ? aliases : (aliases ? aliases.split(',').map(s => s.trim()) : []);

    const { data, error } = await supabase
      .from('people')
      .insert({
        real_name: realName.trim(),
        aliases: cleanAliases,
        relationship,
        opinion,
        notes
      })
      .select();

    if (error) throw error;
    res.json({ success: true, person: data[0] });
  } catch (error) {
    console.error('[Brian Router] Add person error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/brian/stories
 * Body: { title, summary, fullText, people, emotion }
 * Creates a story record and automatically generates its vector embedding.
 */
router.post('/stories', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { title, summary, fullText, people, emotion } = req.body;
  if (!title || !fullText) {
    return res.status(400).json({ error: 'Missing title or fullText' });
  }

  try {
    const cleanPeople = Array.isArray(people) ? people : (people ? people.split(',').map(s => s.trim()) : []);
    
    // Combine fields to generate a rich embedding context
    const embeddingText = `Title: ${title}\nSummary: ${summary || ''}\nContent: ${fullText}\nEmotion: ${emotion || ''}`;
    const embedding = await getEmbedding(embeddingText);

    const { data, error } = await supabase
      .from('stories')
      .insert({
        title,
        summary: summary || title,
        full_text: fullText,
        people: cleanPeople,
        emotion: emotion || 'neutral',
        embedding
      })
      .select();

    if (error) throw error;
    res.json({ success: true, story: data[0] });
  } catch (error) {
    console.error('[Brian Router] Add story error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/brian/data
 * Returns stats on loaded people and stories.
 */
router.get('/data', async (req, res) => {
  try {
    const { count: peopleCount, error: pErr } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
    
    const { count: storiesCount, error: sErr } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true });

    if (pErr || sErr) throw pErr || sErr;

    res.json({
      peopleCount: peopleCount || 0,
      storiesCount: storiesCount || 0
    });
  } catch (error) {
    console.error('[Brian Router] Get data stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/brian/conversations
 * Query params: search (optional), userFilter (optional)
 * Returns a list of conversation sessions, filtered by access rules.
 */
router.get('/conversations', async (req, res) => {
  const { search, userFilter } = req.query;
  const isOwner = req.isOwner || false;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  try {
    let query = supabase
      .from('user_conversations')
      .select('session_id, user_name, conversation_summary, updated_at')
      .order('updated_at', { ascending: false });

    // Enforce guest isolation or apply admin filters
    if (!isOwner) {
      query = query.ilike('user_name', reqUser.trim());
    } else if (userFilter && userFilter !== 'all') {
      if (userFilter === 'owner') {
        query = query.ilike('user_name', 'Owner');
      } else {
        query = query.ilike('user_name', userFilter.trim());
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    let conversations = data || [];

    if (search) {
      const cleanSearch = search.toLowerCase();
      conversations = conversations.filter(c => {
        // Match user name
        if (c.user_name && c.user_name.toLowerCase().includes(cleanSearch)) return true;
        
        // Match inside chat log messages
        if (c.conversation_summary) {
          try {
            const chatLog = JSON.parse(c.conversation_summary);
            if (Array.isArray(chatLog)) {
              return chatLog.some(m => m.text && m.text.toLowerCase().includes(cleanSearch));
            }
          } catch (e) {
            // Plain text fallback
            return c.conversation_summary.toLowerCase().includes(cleanSearch);
          }
        }
        return false;
      });
    }

    // Format for the frontend list
    const formatted = conversations.map(c => {
      let firstMessage = '';
      let msgCount = 0;
      try {
        const chatLog = JSON.parse(c.conversation_summary);
        if (Array.isArray(chatLog) && chatLog.length > 0) {
          firstMessage = chatLog[0].text;
          msgCount = chatLog.length;
        }
      } catch (e) {
        firstMessage = c.conversation_summary || '';
      }

      return {
        sessionId: c.session_id,
        userName: c.user_name,
        updatedAt: c.updated_at,
        firstMessage: firstMessage,
        messageCount: msgCount
      };
    });

    res.json({ success: true, conversations: formatted });
  } catch (error) {
    console.error('[Brian Router] Get conversations error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/brian/conversations/:sessionId
 * Returns the full message log for a specific conversation session.
 */
router.get('/conversations/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const isOwner = req.isOwner || false;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  try {
    let query = supabase
      .from('user_conversations')
      .select('*')
      .eq('session_id', sessionId);

    if (!isOwner) {
      query = query.ilike('user_name', reqUser.trim());
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    let messages = [];
    if (data.conversation_summary) {
      try {
        messages = JSON.parse(data.conversation_summary);
      } catch (e) {
        // Fallback if it was plain text
        messages = [{ sender: 'System', text: data.conversation_summary }];
      }
    }

    res.json({
      success: true,
      conversation: {
        sessionId: data.session_id,
        userName: data.user_name,
        updatedAt: data.updated_at,
        messages
      }
    });
  } catch (error) {
    console.error('[Brian Router] Get conversation by ID error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/brian/conversations/:sessionId
 * Deletes a conversation session.
 */
router.delete('/conversations/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const isOwner = req.isOwner || false;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  try {
    let deleteQuery = supabase
      .from('user_conversations')
      .delete()
      .eq('session_id', sessionId);

    if (!isOwner) {
      deleteQuery = deleteQuery.ilike('user_name', reqUser.trim());
    }

    const { error } = await deleteQuery;

    if (error) throw error;

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('[Brian Router] Delete conversation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/brian/people
 * Admin-only: Returns a list of all registered people relationship profiles.
 */
router.get('/people', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('real_name', { ascending: true });

    if (error) throw error;
    res.json({ success: true, people: data || [] });
  } catch (error) {
    console.error('[Brian Router] Get people error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/brian/people/:id
 * Admin-only: Deletes a relationship profile by ID.
 */
router.delete('/people/:id', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Person profile deleted successfully' });
  } catch (error) {
    console.error('[Brian Router] Delete person error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/brian/stories
 * Admin-only: Returns a list of all global stories.
 */
router.get('/stories', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, summary, full_text, people, emotion, date')
      .order('date', { ascending: false });

    if (error) throw error;
    res.json({ success: true, stories: data || [] });
  } catch (error) {
    console.error('[Brian Router] Get stories error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/brian/stories/:id
 * Admin-only: Deletes a story record by ID.
 */
router.delete('/stories/:id', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('[Brian Router] Delete story error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/brian/people/:id
 * Admin-only: Updates an existing relationship profile by ID.
 */
router.put('/people/:id', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { id } = req.params;
  const { realName, aliases, relationship, opinion, notes } = req.body;

  if (!realName) {
    return res.status(400).json({ error: 'Missing realName' });
  }

  try {
    // Check if the updated name conflicts with another record case-insensitively
    const { data: conflict, error: checkErr } = await supabase
      .from('people')
      .select('id, real_name')
      .ilike('real_name', realName.trim())
      .neq('id', id)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (conflict) {
      return res.status(400).json({ error: `A relationship profile for "${realName}" already exists.` });
    }

    const cleanAliases = Array.isArray(aliases) ? aliases : (aliases ? aliases.split(',').map(s => s.trim()) : []);

    const { data, error } = await supabase
      .from('people')
      .update({
        real_name: realName.trim(),
        aliases: cleanAliases,
        relationship,
        opinion,
        notes
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, person: data[0] });
  } catch (error) {
    console.error('[Brian Router] Update person error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/brian/stories/:id
 * Admin-only: Updates an existing story record and regenerates its vector embedding.
 */
router.put('/stories/:id', async (req, res) => {
  if (!req.isOwner) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { id } = req.params;
  const { title, summary, fullText, people, emotion } = req.body;

  if (!title || !fullText) {
    return res.status(400).json({ error: 'Missing title or fullText' });
  }

  try {
    const cleanPeople = Array.isArray(people) ? people : (people ? people.split(',').map(s => s.trim()) : []);

    // Combine fields to generate a rich embedding context
    const embeddingText = `Title: ${title}\nSummary: ${summary || ''}\nContent: ${fullText}\nEmotion: ${emotion || ''}`;
    const embedding = await getEmbedding(embeddingText);

    const { data, error } = await supabase
      .from('stories')
      .update({
        title,
        summary: summary || title,
        full_text: fullText,
        people: cleanPeople,
        emotion: emotion || 'neutral',
        embedding
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, story: data[0] });
  } catch (error) {
    console.error('[Brian Router] Update story error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

