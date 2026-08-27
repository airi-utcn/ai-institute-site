declare const process: any;
declare const fetch: any;

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.SNIPEIT_API_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json",
});

const baseUrl = process.env.SNIPEIT_URL;

export const snipeitService = {
  async findOrCreateUser(firstName: string, lastName: string, email: string) {
    // Caută utilizatorul
    const searchRes = await fetch(`${baseUrl}/api/v1/users?search=${encodeURIComponent(email)}`, { headers: getHeaders() });
    const searchData = await searchRes.json();
    const user = searchData.rows?.find((u: any) => u.email === email);
    if (user) return user.id;

    const generatedPassword = Math.random().toString(36).slice(2) + "Aa1!";
    const createRes = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        username: email,
        email: email,
        password: generatedPassword,
        password_confirmation: generatedPassword,
      })
    });
    const createData = await createRes.json();
    return createData.payload.id;
  },

  async checkoutAsset(assetId: string, userId: number, notes: string) {
    await fetch(`${baseUrl}/api/v1/hardware/${assetId}/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ checkout_to_type: 'user', assigned_user: userId, note: notes })
    });
  },

  async checkinAsset(assetId: string, notes: string) {
    await fetch(`${baseUrl}/api/v1/hardware/${assetId}/checkin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ note: notes })
    });
  }
};