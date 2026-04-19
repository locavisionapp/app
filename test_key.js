const keys = [
  "AIzaSyA4AtrVlY4zybZUtEDLRUdkCLQuEAnsALk", // User paste
  "AIzaSyA4AtrVIY4zybZUtEDLRUDkCLQuEAnsALk", // Capital I, Capital D
  "AIzaSyA4AtrVlY4zybZUtEDLRUDkCLQuEAnsALk", // Lower l, Capital D
  "AIzaSyA4AtrVIY4zybZUtEDLRUdkCLQuEAnsALk"  // Capital I, Lower d
];

async function testKeys() {
  for (const key of keys) {
    console.log(`Testing key: ${key}`);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await resp.json();
      if (resp.ok) {
        console.log(`SUCCESS! Valid models for this key:`, data.models.slice(0, 3).map(m => m.name));
        return;
      } else {
        console.log(`FAILED: ${data.error?.message}`);
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
}

testKeys();
