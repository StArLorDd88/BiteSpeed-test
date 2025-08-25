import pool from "../config/db.config.js";

export async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function findDirectMatches(client, { email, phoneNumber }) {
  const params = [];
  const clauses = [];
  if (email) { params.push(email); clauses.push(`email = $${params.length}`); }
  if (phoneNumber) { params.push(phoneNumber); clauses.push(`phoneNumber = $${params.length}`); }

  if (clauses.length === 0) return [];

  const { rows } = await client.query(
    `
    SELECT * FROM contacts
    WHERE ${clauses.join(" OR ")}
    ORDER BY createdAt ASC
    FOR UPDATE
    `
    , params
  );
  return rows;
}

export function pickOldestPrimary(contacts) {
  if (contacts.length === 0) return null;
  // candidate primaries = rows marked primary OR simply the earliest row
  const primaries = contacts.filter(c => c.linkprecedence === "primary");
  const poolToPick = primaries.length ? primaries : contacts;
  return poolToPick.reduce((oldest, c) =>
    new Date(c.createdat) < new Date(oldest.createdat) ? c : oldest
  );
}

export async function downgradePrimaryAndRelink(client, fromPrimaryId, toPrimaryId) {
  // Turn the newer primary into secondary
  await client.query(
    `UPDATE contacts
     SET linkPrecedence = 'secondary', linkedId = $1, updatedAt = NOW()
     WHERE id = $2`,
    [toPrimaryId, fromPrimaryId]
  );

  // Re-link all of its children to the oldest primary
  await client.query(
    `UPDATE contacts
     SET linkedId = $1, updatedAt = NOW()
     WHERE linkedId = $2`,
    [toPrimaryId, fromPrimaryId]
  );
}

export async function insertPrimary(client, { email, phoneNumber }) {
  const { rows } = await client.query(
    `INSERT INTO contacts (email, phoneNumber, linkPrecedence)
     VALUES ($1, $2, 'primary')
     RETURNING *`,
    [email || null, phoneNumber || null]
  );
  return rows[0];
}

export async function insertSecondary(client, { email, phoneNumber, primaryId }) {
  const { rows } = await client.query(
    `INSERT INTO contacts (email, phoneNumber, linkPrecedence, linkedId)
     VALUES ($1, $2, 'secondary', $3)
     RETURNING *`,
    [email || null, phoneNumber || null, primaryId]
  );
  return rows[0];
}

export async function getClusterByPrimary(client, primaryId) {
  // After merges, all secondaries should directly link to the primary
  const { rows } = await client.query(
    `SELECT * FROM contacts
     WHERE id = $1 OR linkedId = $1
     ORDER BY createdAt ASC`,
    [primaryId]
  );
  return rows;
}
