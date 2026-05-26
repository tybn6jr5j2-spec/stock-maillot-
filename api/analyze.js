export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const body = req.body;
    
    // Forcer le media_type en image/jpeg si format non supporté
    if (body.messages) {
      body.messages = body.messages.map(msg => {
        if (Array.isArray(msg.content)) {
          msg.content = msg.content.map(block => {
            if (block.type === 'image' && block.source) {
              const mt = block.source.media_type || '';
              if (!['image/jpeg','image/png','image/gif','image/webp'].includes(mt)) {
                block.source.media_type = 'image/jpeg';
              }
            }
            return block;
          });
        }
        return msg;
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
