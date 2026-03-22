// Vercel Serverless Function - Keeps Supabase database active
// This endpoint is called by Vercel Cron to prevent Supabase free tier from pausing

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      status: 'skipped',
      message: 'Supabase not configured',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Simple query to keep the database active
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      return res.status(200).json({
        status: 'success',
        message: 'Database pinged successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(200).json({
        status: 'warning',
        message: `Database responded with status ${response.status}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return res.status(200).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
