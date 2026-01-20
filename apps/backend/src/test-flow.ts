import { describe, expect, test } from "bun:test";

const BASE_URL = "http://localhost:3000/api";
const USER = { name: "Alin", email: "alin@example.com", password: "securepassword" };
let token = "";

// 0. Register User (Create "Alin" if he doesn't exist)
console.log("--- 0. Registering User ---");
const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(USER)
});
const regData = await regRes.json() as { message?: string; error?: string };
console.log(regData.message || regData.error); // Prints "User created" or "Email exists"

// 1. Try to Login
console.log("\n--- 1. Testing Login ---");
const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: USER.email, password: USER.password })
});
const loginData = await loginRes.json() as { accessToken?: string; error?: string };

if (loginData.accessToken) {
    console.log("✅ Login Success! Token received.");
    token = loginData.accessToken;
} else {
    console.error("❌ Login Failed:", loginData);
    process.exit(1);
}

// 2. Try to Add a Website (Needs Token)
console.log("\n--- 2. Adding Website (google.com) ---");
const addSiteRes = await fetch(`${BASE_URL}/websites`, {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ url: "https://google.com", is_public: true })
});
const addSiteData = await addSiteRes.json() as { message?: string; error?: string };
console.log("Response:", addSiteData);

// 3. List Websites to Verify
console.log("\n--- 3. Verifying Website in List ---");
const listRes = await fetch(`${BASE_URL}/websites`, {
    headers: { "Authorization": `Bearer ${token}` }
});
const listData = await listRes.json() as unknown[];
console.log("My Websites:", listData);