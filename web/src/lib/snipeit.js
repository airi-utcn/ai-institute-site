export async function getAllAssets() {
  const url = process.env.SNIPEIT_URL || "http://localhost:8000";
  const res = await fetch(`${url}/api/v1/hardware`, {
    headers: {
      'Authorization': `Bearer ${process.env.SNIPEIT_API_KEY}`,
      'Accept': 'application/json'
    },
    cache: 'no-store' 
  });

  if (!res.ok) {
    throw new Error('Failed to fetch assets from Snipe-IT');
  }

  const data = await res.json();
  return data.rows || [];
}

export async function getAssetById(id) {
  const url = process.env.SNIPEIT_URL || "http://localhost:8000";
  const res = await fetch(`${url}/api/v1/hardware/${id}`, {
    headers: {
      'Authorization': `Bearer ${process.env.SNIPEIT_API_KEY}`,
      'Accept': 'application/json'
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch asset ${id} from Snipe-IT`);
  }

  const data = await res.json();
  return data;
}