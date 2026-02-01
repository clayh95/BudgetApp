/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function loadProjectId() {
  const rcPath = path.resolve(__dirname, '..', '.firebaserc');
  if (!fs.existsSync(rcPath)) {
    throw new Error('Missing .firebaserc. Set FIREBASE_PROJECT or create .firebaserc.');
  }
  const data = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
  return process.env.FIREBASE_PROJECT || data?.projects?.default;
}

function parseMoney(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (cleaned.trim() === '') return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function timestampForFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function main() {
  const projectId = loadProjectId();
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId
  });

  const db = admin.firestore();
  const backupDir = path.resolve(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `amounts-backup-${timestampForFilename()}.json`);

  const backup = {
    projectId,
    createdAt: new Date().toISOString(),
    months: {}
  };

  let updatesPlanned = 0;
  const monthsSnap = await db.collection('monthsPK').get();
  for (const monthDoc of monthsSnap.docs) {
    const monthId = monthDoc.id;
    backup.months[monthId] = { categories: {}, transactions: {} };

    const catsSnap = await monthDoc.ref.collection('categories').get();
    const transSnap = await monthDoc.ref.collection('transactions').get();

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of catsSnap.docs) {
      const data = doc.data();
      backup.months[monthId].categories[doc.id] = data;
      const parsed = parseMoney(data.budgeted);
      if (parsed !== null && (typeof data.budgeted !== 'number' || data.budgeted !== parsed)) {
        batch.update(doc.ref, { budgeted: parsed });
        batchCount += 1;
        updatesPlanned += 1;
      }
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    for (const doc of transSnap.docs) {
      const data = doc.data();
      backup.months[monthId].transactions[doc.id] = data;
      const parsed = parseMoney(data.amount);
      if (parsed !== null && (typeof data.amount !== 'number' || data.amount !== parsed)) {
        batch.update(doc.ref, { amount: parsed });
        batchCount += 1;
        updatesPlanned += 1;
      }
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

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`Backup written to ${backupPath}`);
  console.log(`Planned updates: ${updatesPlanned}`);
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
