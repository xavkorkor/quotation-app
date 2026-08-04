export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
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

    const prompt = `You are an expert Singapore automotive workshop quotation and job-sheet reader. Read the WHOLE image visually, including difficult cursive handwriting, abbreviations, overwritten text, arrows and amounts. Reason from automotive context like a workshop advisor, not like basic OCR.

VERY IMPORTANT WORKSHOP RULES:
1. Job sheets often contain several workflow / diagnosis descriptions BEFORE any dollar amount appears. These top unpriced lines are usually NOT quotation line items. Start extracting chargeable quotation items from the FIRST credible monetary amount and continue downward from there.
2. Do not create chargeable items from earlier unpriced workflow notes unless they are clearly tied to a later priced line.
3. Never invent a price. A number must visually look like an amount. Ignore dates, mileage, phone numbers, work-order numbers and vehicle registration numbers as prices.
4. Preserve written quantities and units such as 8L, 1 pc, 2 pcs, 1 set, 1 bottle. If no quantity is visible, use '1 job' for labour/service and '1 pc' only when it clearly refers to a part.
5. Common Alan's United wording includes: synthetic engine oil, engine oil, oil pan, original 92Ah battery, auxiliary battery, push start switch, keyless system, keyless control unit, seat control unit, brake servo, outside service, inspection fee, calibration, reprogramming, diagnose, labour, remove and renew, strip and check, rear bumper, tail lamp, reflector, cross member, lower pad, chrome, sensor, shock absorber, gearbox, gearbox oil, gasket, O ring, bush, lower arm, tie rod, rack end, bearing, spray paint.
6. Interpret common abbreviations contextually: ORI = original, BTRY = battery, AUX = auxiliary, L/H = left hand, R/H = right hand, FRT = front, RR = rear, ENG = engine, GB = gearbox, O/S or outside svc = outside service, insp = inspection.
7. If an unpriced line AFTER the first priced line is clearly included under a lump-sum repair, set included=true and price=null. Otherwise do not invent inclusion.
8. Preserve front/rear/left/right distinctions.
9. Group related priced lines into sensible sections such as ENGINE / SERVICE, BODY PARTS, LABOUR / OUTSIDE SERVICE, SUSPENSION, GEARBOX, BRAKES, AIRCON, ELECTRICAL.
10. If handwriting is uncertain, make the best automotive-context interpretation, set confidence='low', and put the closest visible wording in source_text. Do not silently fabricate text.
11. Do not add subtotal, total, GST, dates, mileage or phone numbers as items.

Return only the requested structured data.`;

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-5.6-terra',
        reasoning: { effort: 'high' },
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
