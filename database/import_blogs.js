require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../src/db');
const { getEmbedding } = require('../src/brian/brian_manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('[Import Blogs] ERROR: GEMINI_API_KEY is not set in environment variables.');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Uses Gemini LLM to extract structured metadata, summary, emotional tone,
 * and relationship details from a raw blog post text.
 */
async function extractBlogMetadata(title, rawText) {
  console.log(`[LLM Analysis] Analyzing blog: "${title}"...`);
  const chatModel = genAI.getGenerativeModel({ model: modelName });
  
  const prompt = `You are a blog metadata extractor for Brian, an AI character.
Analyze the following blog post.

Blog Title: ${title}
Blog Content:
"""
${rawText}
"""

Extract and return a JSON object with the following fields:
1. "title": A refined or corrected title for the story (string).
2. "summary": A concise 1-2 sentence summary of the key event or story (string).
3. "people": An array of strings representing the names or nicknames of people mentioned in the story (excluding Sadekin Borno / author themselves, unless they are the central focus).
4. "emotion": The primary emotional tone of the post (e.g., "proud", "grateful", "nostalgic", "funny", "adventurous", "excited", "reflective", "neutral").
5. "people_profiles": An array of objects for any people mentioned in the post who have a relationship with Sadekin Borno (friends, family, colleagues). Each object should contain:
   - "real_name": The person's standard real name (capitalized).
   - "aliases": An array of nicknames or alternative names they go by in the blog.
   - "relationship": Their relationship to Borno (e.g., "Close Friend", "Mother", "Classmate", "Colleague").
   - "opinion": A brief sentence summarizing Borno's opinion of them based on the blog context.
   - "notes": A brief note about what they did or their context in this blog post.

Return ONLY valid JSON. Do not include markdown code block formatting (like \`\`\`json).`;

  try {
    const response = await chatModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });

    const textResponse = response.response.text().trim();
    return JSON.parse(textResponse);
  } catch (error) {
    console.error('[LLM Analysis] Error extracting metadata:', error);
    throw error;
  }
}

/**
 * Imports a single blog file into the Supabase database.
 */
async function importBlogFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n========================================\nProcessing file: ${fileName}`);
  
  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    
    // Attempt to parse simple title from filename or front matter
    let title = path.basename(filePath, path.extname(filePath))
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    // Extract metadata using Gemini
    const metadata = await extractBlogMetadata(title, rawContent);
    console.log(`[Extracted Metadata]:`, JSON.stringify(metadata, null, 2));

    const finalTitle = metadata.title || title;
    const summary = metadata.summary || finalTitle;
    const emotion = metadata.emotion || 'neutral';
    const people = metadata.people || [];

    // 1. Generate Embedding for vector search
    // Combine title, summary, content and emotion for richer semantic retrieval
    const embeddingText = `Title: ${finalTitle}\nSummary: ${summary}\nContent: ${rawContent}\nEmotion: ${emotion}`;
    console.log(`[Embedding] Generating 768-dimension vector embedding...`);
    const embedding = await getEmbedding(embeddingText);

    // 2. Insert Story into stories table
    console.log(`[Database] Saving story to "stories" table...`);
    const { data: storyData, error: storyError } = await supabase
      .from('stories')
      .insert({
        title: finalTitle,
        summary: summary,
        full_text: rawContent,
        people: people,
        emotion: emotion,
        embedding: embedding,
        date: new Date().toISOString()
      })
      .select();

    if (storyError) throw storyError;
    console.log(`[Success] Story "${finalTitle}" successfully saved!`);

    // 3. Upsert relationship profiles to people table
    if (metadata.people_profiles && metadata.people_profiles.length > 0) {
      console.log(`[Database] Processing ${metadata.people_profiles.length} relationship profile(s)...`);
      for (const profile of metadata.people_profiles) {
        const { data: personData, error: personError } = await supabase
          .from('people')
          .upsert({
            real_name: profile.real_name,
            aliases: profile.aliases || [],
            relationship: profile.relationship || 'Friend',
            opinion: profile.opinion || '',
            notes: profile.notes || ''
          }, { onConflict: 'real_name' })
          .select();

        if (personError) {
          console.error(`[Error] Failed to upsert profile for ${profile.real_name}:`, personError.message);
        } else {
          console.log(`[Success] Upserted relationship profile for ${profile.real_name}`);
        }
      }
    }
  } catch (error) {
    console.error(`[Error] Failed to import blog from ${fileName}:`, error);
  }
}

/**
 * Main execution handler
 */
async function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0];

  if (!targetPath) {
    console.log(`
Usage:
  node import_blogs.js <path_to_blog_file_or_directory>

Examples:
  node import_blogs.js ./data/blogs/my_trip_to_sajek.txt
  node import_blogs.js ./data/blogs/
    `);
    process.exit(0);
  }

  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(resolvedPath);
  if (stats.isFile()) {
    await importBlogFile(resolvedPath);
  } else if (stats.isDirectory()) {
    console.log(`Scanning directory: ${resolvedPath}`);
    const files = fs.readdirSync(resolvedPath)
      .filter(file => ['.txt', '.md', '.html'].includes(path.extname(file).toLowerCase()));
    
    if (files.length === 0) {
      console.log('No text (.txt), Markdown (.md), or HTML (.html) files found in directory.');
      process.exit(0);
    }

    console.log(`Found ${files.length} blog files to import.`);
    for (const file of files) {
      const fullFilePath = path.join(resolvedPath, file);
      await importBlogFile(fullFilePath);
    }
  }

  console.log('\n--- Import Process Completed ---');
  process.exit(0);
}

main();
