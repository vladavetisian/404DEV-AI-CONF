async function createRepo(token, repoName, description) {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': '404DEV-AI'
    },
    body: JSON.stringify({ name: repoName, description: description, private: false, auto_init: false })
  });
  if (!res.ok) {
    const err = await res.json();
    const msg = err.errors?.[0]?.message || err.message || 'Failed to create repo';
    throw new Error(msg);
  }
  return res.json();
}

async function createFile(token, owner, repo, path, content, message) {
  const base64Content = Buffer.from(content).toString('base64');
  const res = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': '404DEV-AI'
    },
    body: JSON.stringify({ message: message, content: base64Content, branch: 'main' })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create file');
  }
}

async function enablePages(token, owner, repo) {
  const res = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/pages', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': '404DEV-AI'
    },
    body: JSON.stringify({ source: { branch: 'main', path: '/' } })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to enable Pages');
  }
}

function generateBotHTML(agentName, businessName, industry, config) {
  config = config || {};
  const color = config.color || '#7C3AED';
  const header = config.header || agentName;
  const greeting = config.greeting || 'Hi! How can I help you today?';
  const suggestions = config.suggestions ? config.suggestions.split(',').map(s => s.trim()).filter(Boolean) : ['What services do you offer?'];
  const position = config.position || 'bottom-right';
  const size = config.size || 'medium';
  const style = config.style || 'rounded';

  let width = 400;
  if (size === 'small') width = 320;
  if (size === 'large') width = 500;

  let posStyles = 'right: 20px; left: auto;';
  if (position === 'bottom-left') posStyles = 'left: 20px; right: auto;';

  let borderRadius = '16px', msgRadius = '16px';
  if (style === 'square') { borderRadius = '4px'; msgRadius = '4px'; }
  if (style === 'minimal') { borderRadius = '8px'; msgRadius = '8px'; }

  const chips = suggestions.map(s => '<span class="chip" onclick="sendSug(\'' + s.replace(/'/g, "\\'") + '\')">' + s + '</span>').join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${header} | ${businessName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;font-family:system-ui,sans-serif;overflow:hidden}
.widget-container{position:fixed;bottom:20px;${posStyles}width:${width}px;max-height:600px;background:#fff;border-radius:${borderRadius};box-shadow:0 8px 32px rgba(0,0,0,0.15);overflow:hidden;display:flex;flex-direction:column;z-index:9999;font-size:14px}
.widget-header{background:${color};color:#fff;padding:16px 20px;font-weight:600;font-size:16px;display:flex;align-items:center;gap:10px}
.widget-header .dot{width:10px;height:10px;background:#4ade80;border-radius:50%}
.widget-header small{font-weight:400;opacity:0.8;font-size:11px;display:block}
.widget-messages{flex:1;padding:16px;overflow-y:auto;max-height:300px;background:#f9fafb}
.message{margin-bottom:12px;animation:fadeIn 0.3s}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.bot-message{background:#f3f4f6;color:#1f2937;padding:10px 14px;border-radius:${msgRadius} ${msgRadius} ${msgRadius} 4px;display:inline-block;max-width:85%;line-height:1.5}
.user-message{text-align:right}
.user-message div{background:${color};color:#fff;padding:10px 14px;border-radius:${msgRadius} ${msgRadius} 4px ${msgRadius};display:inline-block;max-width:85%;line-height:1.5}
.suggestions{padding:8px 16px;display:flex;flex-wrap:wrap;gap:6px;background:#f9fafb;border-top:1px solid #e5e7eb}
.chip{background:#fff;border:1px solid #d1d5db;color:#374151;padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer}
.chip:hover{background:${color};color:#fff;border-color:${color}}
.widget-input{display:flex;padding:12px 16px;background:#fff;border-top:1px solid #e5e7eb}
.widget-input input{flex:1;padding:10px 14px;border:1px solid #d1d5db;border-radius:24px;font-size:14px;outline:none}
.widget-input input:focus{border-color:${color}}
.widget-input button{background:${color};border:none;width:40px;height:40px;border-radius:50%;cursor:pointer;margin-left:8px;color:#fff;font-size:18px}
.powered{text-align:center;font-size:10px;color:#9ca3af;padding:6px;background:#f9fafb}
</style>
</head>
<body>
<div class="widget-container">
<div class="widget-header"><span class="dot"></span><div>${header}<small>${businessName}</small></div></div>
<div class="suggestions" id="sug">${chips}</div>
<div class="widget-messages" id="msgs"><div class="message"><div class="bot-message">${greeting}</div></div></div>
<div class="widget-input"><input id="inp" placeholder="Type your message..." autofocus><button onclick="send()">➤</button></div>
<div class="powered">Powered by 404DEV AI</div>
</div>
<script>
var msgs=document.getElementById("msgs"),inp=document.getElementById("inp"),sug=document.getElementById("sug");
var r={hello:"Hi there!",hi:"Hello!",help:"I'm here to help!",price:"We'd love to discuss pricing! Leave your contact.",contact:"Reach us here or leave your email.",book:"I can help you schedule! What service?",default:"Thanks! Our team will follow up."};
function sendSug(t){inp.value=t;send()}
function send(){var t=inp.value.trim();if(!t)return;msgs.innerHTML+='<div class="message user-message"><div>'+t+'</div></div>';sug.style.display="none";setTimeout(function(){var l=t.toLowerCase(),re=r.default;for(var k in r){if(l.indexOf(k)>=0){re=r[k];break}}msgs.innerHTML+='<div class="message"><div class="bot-message">'+re+'</div></div>';msgs.scrollTop=msgs.scrollHeight},600);inp.value="";msgs.scrollTop=msgs.scrollHeight}
inp.addEventListener("keypress",function(e){if(e.key==="Enter")send()});
</script>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, agentType, businessName, industry, websiteUrl, config } = req.body;

    if (!token) return res.status(400).json({ error: 'GitHub token required.' });
    if (!agentType || !businessName) return res.status(400).json({ error: 'Missing required fields.' });

    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': '404DEV-AI' }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token.', authUrl: 'https://' + req.headers.host + '/api/github-oauth' });

    const userData = await userRes.json();
    const username = userData.login;
    const safeName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);
    const repoName = safeName + '-ai-agent-' + Date.now().toString(36);

    await createRepo(token, repoName, 'AI Chat Agent for ' + businessName);
    await new Promise(r => setTimeout(r, 2500));

    const botHTML = generateBotHTML(agentType, businessName, industry, config);
    await createFile(token, username, repoName, 'index.html', botHTML, 'Add AI chat widget');
    await createFile(token, username, repoName, 'README.md', '# ' + agentType + ' for ' + businessName + '\n\nBuilt with 404DEV AI', 'Add README');
    await enablePages(token, username, repoName);

    return res.status(200).json({
      success: true,
      repoUrl: 'https://github.com/' + username + '/' + repoName,
      deployedUrl: 'https://' + username + '.github.io/' + repoName,
      message: 'Agent deployed! Takes 1-2 minutes to publish.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Deploy failed: ' + err.message });
  }
}
