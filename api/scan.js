// api/scan.js
// Server-side proxy for certificate scanning via Hugging Face.
// Runs on Vercel's servers — avoids browser CORS issues and keeps
// the HF token completely hidden from the client.
//
// Required Vercel env var: HF_TOKEN (no REACT_APP_ prefix — server-side only)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    console.error('[api/scan] HF_TOKEN env var is not set');
    return res.status(200).json({ error: 'NOT_CONFIGURED' });
  }

  try {
    const { image, mimeType } = req.body || {};
    if (!image || !mimeType) {
      return res.status(200).json({ error: 'BAD_REQUEST' });
    }

    const buffer = Buffer.from(image, 'base64');

    const hfRes = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType,
        },
        body: buffer,
      }
    );

    if (!hfRes.ok) {
      const errText = await hfRes.text().catch(() => '');
      console.error('[api/scan] HF error', hfRes.status, errText);
      return res.status(200).json({ error: 'HF_ERROR', status: hfRes.status, detail: errText });
    }

    const data = await hfRes.json();
    return res.status(200).json({ data });
  } catch (e) {
    console.error('[api/scan] server error', e);
    return res.status(200).json({ error: 'SERVER_ERROR', message: e.message });
  }
}
