const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

void main();

async function main() {
  const response = await fetch(baseUrl);

  if (!response.ok) {
    throw new Error(`Smoke test failed: ${response.status} ${response.statusText}`);
  }

  console.log(`Smoke test OK: ${baseUrl}`);
}
