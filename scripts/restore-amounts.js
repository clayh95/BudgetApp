/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function loadProjectId(backupProjectId) {
  const rcPath = path.resolve(__dirname, '..', '.firebaserc');
  if (fs.existsSync(rcPath)) {
    const data = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
    return process.env.FIREBASE_PROJECT || backupProjectId || data?.projects?.default;
  }
  return process.env.FIREBASE_PROJECT || backupProjectId;
}

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error('Usage: node scripts/restore-amounts.js <path-to-backup.json>');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const projectId = loadProjectId(backup.projectId);
  if (!projectId) {
    throw new Error('Project ID not found. Set FIREBASE_PROJECT or include .firebaserc.');
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId
  });

  const db = admin.firestore();
  let writes = 0;

  const months = backup.months || {};
  for (const [monthId, monthData] of Object.entries(months)) {
    const monthRef = db.collection('monthsPK').doc(monthId);

    let batch = db.batch();
    let batchCount = 0;

    const categories = monthData.categories || {};
    for (const [docId, data] of Object.entries(categories)) {
      batch.set(monthRef.collection('categories').doc(docId), data, { merge: false });
      batchCount += 1;
      writes += 1;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    const transactions = monthData.transactions || {};
    for (const [docId, data] of Object.entries(transactions)) {
      batch.set(monthRef.collection('transactions').doc(docId), data, { merge: false });
      batchCount += 1;
      writes += 1;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  console.log(`Restore complete. Documents written: ${writes}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
