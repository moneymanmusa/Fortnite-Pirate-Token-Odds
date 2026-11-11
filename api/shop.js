// Vercel serverless function: GET /api/shop
// Fetches today's Fortnite Item Shop from fortnite-api.com and adds up its value.
// Each item is counted once; a bundle only counts when it contains something not sold on its own.
function summarizeShop(j) {
  const entries = (j && j.data && j.data.entries) || [];
  const ids = e => [].concat(e.brItems || [], e.tracks || [], e.instruments || [], e.cars || [], e.legoKits || [])
    .map(i => i && i.id).filter(Boolean);
  const seen = new Set();
  let vbucks = 0, items = 0;
  const take = e => {
    const list = ids(e), fresh = list.filter(id => !seen.has(id));
    if (list.length && !fresh.length) return;
    fresh.forEach(id => seen.add(id));
    items += fresh.length || 1;
    vbucks += Math.max(0, e.finalPrice || 0);
  };
  entries.filter(e => !e.bundle).forEach(take);
  entries.filter(e => e.bundle).forEach(take);
  return { vbucks, items, offers: entries.length, date: j && j.data && j.data.date, source: 'fortnite-api.com' };
}

module.exports = async (req, res) => {
  try {
    const r = await fetch('https://fortnite-api.com/v2/shop?language=en');
    if (!r.ok) throw new Error('Shop source answered ' + r.status);
    const out = summarizeShop(await r.json());
    // Shop resets daily at 00:00 UTC; cache for 15 minutes at Vercel's edge.
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
