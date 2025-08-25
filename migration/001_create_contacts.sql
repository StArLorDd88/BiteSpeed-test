CREATE TABLE IF NOT EXISTS contacts (
  id              SERIAL PRIMARY KEY,
  phoneNumber     VARCHAR(20),
  email           VARCHAR(255),
  linkedId        INT REFERENCES contacts(id) ON DELETE SET NULL,
  linkPrecedence  VARCHAR(10) NOT NULL CHECK (linkPrecedence IN ('primary','secondary')),
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_contacts_linked ON contacts(linkedId);
  