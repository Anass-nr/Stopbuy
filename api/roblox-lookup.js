// api/roblox-lookup.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return res.status(400).json({ error: 'Invalid username length' });
  }
  if (!/^[A-Za-z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  try {
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        usernames: [cleanUsername],
        excludeBannedUsers: false
      })
    });

    if (!userRes.ok) {
      return res.status(502).json({ error: 'Roblox API unavailable' });
    }

    const userData = await userRes.json();
    if (!userData.data || userData.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userData.data[0];
    const userId = user.id;

    // Avatar
    let avatarUrl = null;
    try {
      const avatarRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
      );
      if (avatarRes.ok) {
        const avatarData = await avatarRes.json();
        avatarUrl = avatarData?.data?.[0]?.imageUrl || null;
      }
    } catch (e) {}

    // Account creation date
    let created = null;
    let description = null;
    try {
      const detailsRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
      if (detailsRes.ok) {
        const details = await detailsRes.json();
        created = details.created || null;
        description = details.description || null;
      }
    } catch (e) {}

    return res.status(200).json({
      id: userId,
      name: user.name,
      displayName: user.displayName || user.name,
      avatarUrl: avatarUrl,
      created: created,
      description: description
    });

  } catch (error) {
    console.error('Roblox lookup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
