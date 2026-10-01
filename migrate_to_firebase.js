import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = {
  apiKey: "AIzaSyBrwtW-KerM1OEQKZQfnKoK5oUlF2SwT4E",
  authDomain: "hakan-bloomberg.firebaseapp.com",
  projectId: "hakan-bloomberg",
  storageBucket: "hakan-bloomberg.firebasestorage.app",
  messagingSenderId: "151865370484",
  appId: "1:151865370484:web:4de606a6facf3c41dcae21",
  measurementId: "G-4LBFYQEFXD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const financeDir = "c:\\Users\\hgenc\\OneDrive\\Desktop\\ANTIGRAVITY\\Finance";

async function migrate() {
  console.log("🚀 Starting data migration to Firebase Firestore...");

  // 1. Migrate Holdings
  const holdingsPath = path.join(financeDir, "holdings.json");
  if (fs.existsSync(holdingsPath)) {
    const holdings = JSON.parse(fs.readFileSync(holdingsPath, "utf-8"));
    console.log(`📦 Migrating ${holdings.length} holdings...`);
    for (const h of holdings) {
      const docId = h.ticker.replace("/", "_").replace(".", "_");
      await setDoc(doc(db, "holdings", docId), h);
      console.log(`  ✓ Holding migrated: ${h.ticker} (${h.name})`);
    }
  }

  // 2. Migrate Gold & PPF (Kur Kalkanı)
  const goldPath = path.join(financeDir, "gold_savings.json");
  if (fs.existsSync(goldPath)) {
    const goldData = JSON.parse(fs.readFileSync(goldPath, "utf-8"));
    console.log(`🥇 Migrating ${(goldData.gold_purchases || []).length} gold purchases...`);
    for (const g of (goldData.gold_purchases || [])) {
      await setDoc(doc(db, "gold_purchases", String(g.id)), g);
      console.log(`  ✓ Gold purchase migrated: ID ${g.id} (${g.grams}g @ ₺${g.buy_price_try})`);
    }

    // PPF Balance & Targets
    await setDoc(doc(db, "allocation", "current"), {
      ppf_balance_try: goldData.ppf_balance_try || 0.0,
      targets: goldData.targets || {},
      guardrails: goldData.guardrails || {},
      last_updated: goldData.last_updated || new Date().toISOString()
    });
    console.log("  ✓ PPF balance and allocation targets migrated.");
  }

  // 3. Migrate Trade Ledger (Gerçekleşen Kâr Defteri)
  const ledgerPath = path.join(financeDir, "trade_ledger.json");
  if (fs.existsSync(ledgerPath)) {
    const trades = JSON.parse(fs.readFileSync(ledgerPath, "utf-8"));
    console.log(`📜 Migrating ${trades.length} closed trades to ledger...`);
    for (const t of trades) {
      await setDoc(doc(db, "trade_ledger", String(t.id)), t);
      console.log(`  ✓ Trade migrated: ID ${t.id} (${t.ticker} - Profit: +₺${t.realized_pl_try})`);
    }
  }

  // 4. Migrate System Settings
  await setDoc(doc(db, "settings", "preferences"), {
    currency: "try",
    timeframe: "1y",
    theme: "bloomberg_dark",
    system_version: "2.0_cloud",
    migrated_at: new Date().toISOString()
  });
  console.log("  ✓ System preferences initialized.");

  console.log("\n🎉 ALL DATA SUCCESSFULLY MIGRATED TO FIREBASE FIRESTORE! 🎉");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
