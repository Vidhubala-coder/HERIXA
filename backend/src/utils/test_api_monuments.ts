async function testSlug() {
  try {
    const res = await fetch('http://localhost:5000/api/monuments/thirumalai-nayakkar');
    const data: any = await res.json();
    console.log('API response by slug success:', data.success);
    if (data.success) {
      console.log('Name:', data.data.name);
      console.log('Slug:', data.data.slug);
    } else {
      console.log('Error message:', data.message);
    }
  } catch (err: any) {
    console.error('API call failed:', err.message);
  }
}

testSlug();
