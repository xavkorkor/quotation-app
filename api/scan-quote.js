export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'AI scanner is not configured yet.' });

  try {
    const { image, mimeType = 'image/jpeg' } = req.body || {};
    if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Missing image.' });
    if (image.length > 14_000_000) return res.status(413).json({ error: 'Image is too large.' });

    const dataUrl = image.startsWith('data:') ? image : `data:${mimeType};base64,${image}`;
    const schema = {
      type: 'object', additionalProperties: false,
      properties: {
        customer: { type: 'string' }, phone: { type: 'string' }, vehicle: { type: 'string' }, model: { type: 'string' }, mileage: { type: 'string' },
        notes: { type: 'string' },
        sections: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              title: { type: 'string' },
              items: { type: 'array', items: {
                type: 'object', additionalProperties: false,
                properties: {
                  qty: { type: 'string' }, description: { type: 'string' }, price: { type: ['number','null'] }, included: { type: 'boolean' }, confidence: { type: 'string', enum: ['high','medium','low'] }, source_text: { type: 'string' }
                }, required: ['qty','description','price','included','confidence','source_text']
              }}
            }, required: ['title','items']
          }
        }
      }, required: ['customer','phone','vehicle','model','mileage','notes','sections']
    };

    const prompt = `You are an expert automotive workshop quotation reader. Read the uploaded image as a whole, including difficult cursive handwriting. Use automotive context to decipher ambiguous words, but NEVER invent a price, quantity, registration number, phone number, or customer name. Common workshop terms include bumper, tail lamp, reflector, cross member, lower pad, chrome, sensor, shock absorber, gearbox, gasket, O ring, bush, lower arm, tie rod, rack end, bearing, engine oil, gearbox oil, seals, labour, spray paint, remove and renew, repair, replace, overhaul. Preserve left/right/front/rear distinctions. Group related lines into sensible sections such as BODY PARTS, LABOUR / SPRAY, SUSPENSION, GEARBOX, ENGINE, BRAKES, AIRCON. If a line has no separate price but is clearly included under a lump-sum priced repair, set included=true and price=null. If handwriting is uncertain, make the best automotive-context interpretation and set confidence=low; put the closest visible wording in source_text. Do not add totals or GST as line items. Return only the requested structured data.`;

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-5.6-terra',
        reasoning: { effort: 'medium' },
        input: [{ role: 'user', content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: dataUrl, detail: 'high' }
        ]}],
        text: { format: { type: 'json_schema', name: 'automotive_quotation', strict: true, schema } }
      })
    });

    const raw = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: raw?.error?.message || 'AI scan failed.' });
    const text = raw.output_text || raw.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
    if (!text) return res.status(502).json({ error: 'No structured result returned.' });
    return res.status(200).json(JSON.parse(text));
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'AI scan failed.' });
  }
}
