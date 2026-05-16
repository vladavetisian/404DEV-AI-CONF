export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = authHeader.slice(7);

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': '404DEV-AI' }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
    const userData = await userRes.json();
    const username = userData.login;

    const reposRes = await fetch(`https://api.github.com/search/repositories?q=user:${username}+ai-agent&sort=created&order=desc&per_page=50`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': '404DEV-AI' }
    });
    const reposData = await reposRes.json();
    
    const agents = (reposData.items || []).map(repo => ({
      repo: repo.name,
      businessName: repo.description?.replace('AI Chat Agent for ', '') || 'Unknown',
      deployedUrl: `https://${username}.github.io/${repo.name}`,
      repoUrl: repo.html_url,
      createdAt: new Date(repo.created_at).getTime(),
      totalMessages: 0
    }));

    return res.status(200).json({ username, agents });
  } catch (err) {
    return res.status(500).json({ error: 'Dashboard failed: ' + err.message });
  }
}
