export default async function handler(req, res) {
  const { code, state, redirect } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      if (redirect) {
        return res.redirect(redirect + '?token=' + tokenData.access_token);
      }
      let redirectTo = '/?deploy=true&token=' + tokenData.access_token;
      if (state && state.length > 0) {
        redirectTo += '&data=' + encodeURIComponent(state);
      }
      return res.redirect(redirectTo);
    } else {
      return res.status(400).send('GitHub auth failed. Please try again.');
    }
  } catch (err) {
    return res.status(500).send('Auth server error.');
  }
}
