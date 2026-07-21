require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('./db');
const { getEmbedding } = require('./brian_manager');

/**
 * Injects pre-extracted JSON data (e.g. from gemini.google.com) into the database.
 */
async function injectBlogFile(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const blogs = JSON.parse(rawData);
    const blogsArray = Array.isArray(blogs) ? blogs : [blogs];

    console.log(`\n========================================`);
    console.log(`Processing file: ${path.basename(filePath)} (${blogsArray.length} entries)`);

    for (let i = 0; i < blogsArray.length; i++) {
      const blog = blogsArray[i];
      const { title, summary, full_text, people = [], emotion = 'neutral', people_profiles = [] } = blog;

      if (!title || !full_text) {
        console.warn(`[Skip] Entry ${i + 1} in ${path.basename(filePath)} is missing title or full_text.`);
        continue;
      }

      console.log(`----------------------------------------`);
      console.log(`Processing [${i + 1}/${blogsArray.length}]: "${title}"`);

      // 1. Generate Embedding (very cheap, only embedding is requested from API)
      const embeddingText = `Title: ${title}\nSummary: ${summary || title}\nContent: ${full_text}\nEmotion: ${emotion}`;
      console.log(`[Embedding] Generating embedding...`);
      const embedding = await getEmbedding(embeddingText);

      // 2. Insert into stories table
      console.log(`[Database] Inserting story...`);
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title,
          summary: summary || title,
          full_text,
          people,
          emotion,
          embedding,
          date: new Date().toISOString()
        })
        .select();

      if (storyError) {
        console.error(`[Error] Failed to insert story "${title}":`, storyError.message);
        continue;
      }
      console.log(`[Success] Story saved!`);

      // 3. Upsert relationship profiles if provided
      if (people_profiles && people_profiles.length > 0) {
        for (const profile of people_profiles) {
          const { real_name, aliases = [], relationship = 'Friend', opinion = '', notes = '' } = profile;
          if (!real_name) continue;

          console.log(`[Database] Upserting profile for ${real_name}...`);
          const { error: personError } = await supabase
            .from('people')
            .upsert({
              real_name,
              aliases,
              relationship,
              opinion,
              notes
            }, { onConflict: 'real_name' });

          if (personError) {
            console.error(`[Error] Failed to upsert profile for ${real_name}:`, personError.message);
          } else {
            console.log(`[Success] Profile updated.`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to process or inject ${path.basename(filePath)}:`, error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jsonPath = args[0];

  if (!jsonPath) {
    console.log(`
Usage:
  node inject_extracted.js <path_to_json_file_or_directory>

Examples:
  node inject_extracted.js ./data/my_extracted_blogs.json
  node inject_extracted.js ./data/blogs/
    `);
    process.exit(0);
  }

  const resolvedPath = path.resolve(jsonPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(resolvedPath);
  if (stats.isFile()) {
    await injectBlogFile(resolvedPath);
  } else if (stats.isDirectory()) {
    console.log(`Scanning directory: ${resolvedPath}`);
    const files = fs.readdirSync(resolvedPath)
      .filter(file => path.extname(file).toLowerCase() === '.json');

    if (files.length === 0) {
      console.log('No JSON (.json) files found in directory.');
      process.exit(0);
    }

    console.log(`Found ${files.length} JSON files to inject.`);
    for (const file of files) {
      const fullFilePath = path.join(resolvedPath, file);
      await injectBlogFile(fullFilePath);
    }
  }

  console.log(`\n========================================`);
  console.log('Injection process completed successfully!');
  process.exit(0);
}

main();
