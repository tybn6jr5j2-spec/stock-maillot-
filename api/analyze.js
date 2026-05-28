export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;

    // ── MODE GOOGLE VISION OCR ──────────────────────────────────────────────
    if (body.mode === "ocr" || body.mode === "ocr2") {
      const googleKey = process.env.GOOGLE_VISION_KEY;
      if (!googleKey) return res.status(500).json({ error: "GOOGLE_VISION_KEY manquante" });

      // ocr = DOCUMENT_TEXT_DETECTION (meilleur pour documents)
      // ocr2 = TEXT_DETECTION (meilleur pour texte manuscrit épars)
      const featureType = body.mode === "ocr2" ? "TEXT_DETECTION" : "DOCUMENT_TEXT_DETECTION";

      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${googleKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: body.image },
              features: [{ type: featureType, maxResults: 1 }],
              imageContext: { languageHints: ["fr"] }
            }]
          })
        }
      );

      const visionData = await visionRes.json();
      // DOCUMENT_TEXT_DETECTION retourne fullTextAnnotation
      // TEXT_DETECTION retourne textAnnotations[0]
      const fullText = body.mode === "ocr2"
        ? (visionData.responses?.[0]?.textAnnotations?.[0]?.description || "")
        : (visionData.responses?.[0]?.fullTextAnnotation?.text || "");

      return res.status(200).json({ text: fullText });
    }

    // ── MODE CLAUDE (proxy normal) ─────────────────────────────────────────
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
