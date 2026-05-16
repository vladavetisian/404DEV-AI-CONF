export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = 'https://404devai.vercel.app/api/github-callback';
  const scope = 'repo user';
  
  const state = req.query.data || '';
  const redirect = req.query.redirect || '';
  
  const githubUrl = 'https://github.com/login/oauth/authorize' +
    '?client_id=' + clientId +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + scope +
    '&state=' + encodeURIComponent(state) +
    (redirect ? '&redirect=' + encodeURIComponent(redirect) : '');
  
  res.redirect(githubUrl);
}
