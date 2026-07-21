require('dotenv').config();
const supabase = require('../src/db');
const { getEmbedding } = require('../src/brian/brian_manager');

const mockPeople = [
  {
    real_name: 'Ahmed',
    aliases: ['Wizard', 'The Wizard', 'Project Savior'],
    relationship: 'Close friend of Borno',
    opinion: 'Reliable, hardworking, and extremely good at troubleshooting code.',
    notes: 'Ahmed helped solve a major database locking issue right before a project submission.'
  },
  {
    real_name: 'Sadekin Borno',
    aliases: ['Borno', 'Sadekin', 'Mehrab'],
    relationship: 'Older brother',
    opinion: 'Fiercely proud of him. He is a game developer, AI engineer, and founded Arcane Interactives.',
    notes: 'Borno is the builder of the blendd portal. Brian is his younger brother.'
  }
];

const mockStories = [
  {
    title: 'The Day Wizard Saved Our Project',
    summary: 'Ahmed helped solve a major database concurrency deadlock right before the final submission.',
    full_text: 'We were just hours away from the final project presentation when the backend started throwing concurrent connection exceptions. We were panicking, but Ahmed (whom we call the Wizard) sat down, analyzed the Postgres lock tables, refactored our transactions, and saved the entire project from crashing.',
    people: ['Ahmed', 'Wizard'],
    emotion: 'grateful'
  },
  {
    title: 'Founding Arcane Interactives',
    summary: 'Borno started Arcane Interactives to develop immersive game projects.',
    full_text: 'Borno spent months planning and coding. He wanted a studio name that felt magical and technical, so he named it Arcane Interactives. He spent nights working on Unreal Engine prototypes and building tools like FindMe.',
    people: ['Borno', 'Sadekin', 'Mehrab'],
    emotion: 'proud'
  }
];

async function seed() {
  console.log('--- Seeding Project Brian Database ---');
  try {
    // 1. Seed People
    console.log('Seeding relationship profiles...');
    for (const p of mockPeople) {
      const { data, error } = await supabase
        .from('people')
        .upsert(p, { onConflict: 'real_name' })
        .select();
      if (error) throw error;
      console.log(`Upserted person: ${data[0].real_name}`);
    }

    // 2. Seed Stories
    console.log('\nSeeding story records (generating embeddings)...');
    for (const s of mockStories) {
      const embeddingText = `Title: ${s.title}\nSummary: ${s.summary}\nContent: ${s.full_text}\nEmotion: ${s.emotion}`;
      console.log(`Generating embedding for story: "${s.title}"...`);
      const embedding = await getEmbedding(embeddingText);
      
      const { data, error } = await supabase
        .from('stories')
        .insert({
          title: s.title,
          summary: s.summary,
          full_text: s.full_text,
          people: s.people,
          emotion: s.emotion,
          embedding: embedding
        })
        .select();
      if (error) throw error;
      console.log(`Inserted story: ${data[0].title}`);
    }

    console.log('\nDatabase seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
