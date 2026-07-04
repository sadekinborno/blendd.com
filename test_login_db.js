require('dotenv').config();
const supabase = require('./db');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function test() {
  try {
    console.log('--- Checking existing users in the DB ---');
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Fetch users error:', error);
      return;
    }

    console.log('Registered users:', users);

    // Let's test checking credentials for a user
    if (users.length > 0) {
      const user = users[0];
      console.log(`Testing login for user: ${user.username}`);
      
      // Let's test case-insensitive lookup
      const { data: matched, error: matchError } = await supabase
        .from('users')
        .select('username, password')
        .ilike('username', user.username);

      if (matchError) {
        console.error('Lookup match error:', matchError);
      } else {
        console.log('Lookup matched user:', matched);
        if (matched.length > 0) {
          const pass = matched[0].password;
          // Check plaintext or hash
          console.log(`Matched user password field in DB: "${pass}"`);
        }
      }
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
