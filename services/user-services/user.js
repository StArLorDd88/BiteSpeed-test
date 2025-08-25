import {
  withTx,
  findDirectMatches,
  pickOldestPrimary,
  downgradePrimaryAndRelink,
  insertPrimary,
  insertSecondary,
  getClusterByPrimary
} from "../../models/contact.model.js";

export async function userIdentify({ email, phoneNumber }) {
  if (!email && !phoneNumber) {
    const err = new Error("Either email or phoneNumber is required");
    err.statusCode = 400;
    throw err;
  }

  return withTx(async (client) => {
    const matches = await findDirectMatches(client, { email, phoneNumber });

    if (matches.length === 0) {
      const primary = await insertPrimary(client, { email, phoneNumber });
      const emails = primary.email ? [primary.email] : [];
      const phones = primary.phonenumber ? [primary.phonenumber] : [];
      return formatResponse(primary.id, emails, phones, []);
    }

    const oldestPrimary = pickOldestPrimary(matches);

    const otherPrimaries = matches
      .filter(c => c.linkprecedence === "primary" && c.id !== oldestPrimary.id);

    for (const p of otherPrimaries) {
      await downgradePrimaryAndRelink(client, p.id, oldestPrimary.id);
    }

    const cluster = await getClusterByPrimary(client, oldestPrimary.id);

    const clusterEmails = new Set(cluster.map(c => c.email).filter(Boolean));
    const clusterPhones = new Set(cluster.map(c => c.phonenumber).filter(Boolean));

    const needsNewSecondary =
      (email && !clusterEmails.has(email)) ||
      (phoneNumber && !clusterPhones.has(phoneNumber));

    if (needsNewSecondary) {
      await insertSecondary(client, { email, phoneNumber, primaryId: oldestPrimary.id });
    }

    const finalCluster = await getClusterByPrimary(client, oldestPrimary.id);
    const primaryRow = finalCluster.find(c => c.id === oldestPrimary.id);

    const emails = buildOrderedUnique(
      primaryRow?.email ? [primaryRow.email] : [],
      finalCluster.map(c => c.email).filter(Boolean)
    );

    const phoneNumbers = buildOrderedUnique(
      primaryRow?.phonenumber ? [primaryRow.phonenumber] : [],
      finalCluster.map(c => c.phonenumber).filter(Boolean)
    );

    const secondaryIds = finalCluster
      .filter(c => c.linkprecedence === "secondary")
      .map(c => c.id);

    return formatResponse(oldestPrimary.id, emails, phoneNumbers, secondaryIds);
  });
}

function buildOrderedUnique(primaryFirst, allValues) {
  const set = new Set(primaryFirst.filter(Boolean));
  for (const v of allValues) set.add(v);
  return Array.from(set);
}

function formatResponse(primaryId, emails, phoneNumbers, secondaryIds) {
  return {
    contact: {
      primaryContatctId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryIds
    }
  };
}
