import * as SQLite from "expo-sqlite";

let db;

export const initDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("expenseTracker.db");

    // accounts table for savings accounts and credit cards
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        account_number TEXT,
        account_type TEXT NOT NULL,
        bank_name TEXT,
        current_balance REAL DEFAULT 0,
        credit_limit REAL DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        auto_created INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_account_number ON accounts(account_number);
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_default_account ON accounts(is_default);
    `);

    // income table with account linkage
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY NOT NULL,
        source TEXT,
        amount REAL,
        date TEXT,
        account_id INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY NOT NULL,
        category TEXT,
        amount REAL,
        paymentDay INTEGER,
        months_left INTEGER,
        lastPaymentUpdate TEXT
      );
    `);

    // daily_spends table with account linkage
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_spends (
        id INTEGER PRIMARY KEY NOT NULL,
        category TEXT,
        note TEXT,
        amount REAL,
        date TEXT,
        account_id INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
    `);

    // categories table to hold user-defined categories
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT UNIQUE NOT NULL
      );
    `);

    // versioning table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);

    // imported_sms table to track which SMS messages have been imported
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS imported_sms (
        id INTEGER PRIMARY KEY NOT NULL,
        sms_id TEXT UNIQUE NOT NULL,
        imported_at TEXT NOT NULL,
        account_id INTEGER,
        daily_spend_id INTEGER,
        income_id INTEGER,
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (daily_spend_id) REFERENCES daily_spends(id),
        FOREIGN KEY (income_id) REFERENCES income(id)
      );
    `);

    // Create index on sms_id for fast lookups
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sms_id ON imported_sms(sms_id);
    `);
    // ensure metadata is up to date
    await updateMetadata();
    // ensure categories table has defaults on first run
    try {
      await ensureDefaultCategories();
    } catch (e) {
      console.warn('ensureDefaultCategories failed during initDB', e);
    }
    // ensure default account exists
    try {
      await ensureDefaultAccount();
    } catch (e) {
      console.warn('ensureDefaultAccount failed during initDB', e);
    }
  }
  return db;
};

// Seed default categories if table is empty
async function ensureDefaultCategories() {
  const db = getDb();
  try {
    const rows = await db.getAllAsync(`SELECT COUNT(*) as count FROM categories;`);
    const count = rows?.[0]?.count || 0;
    if (count === 0) {
      const defaults = [
        'Groceries',
        'Transport',
        'Dining',
        'Utilities',
        'Entertainment',
        'Health',
        'UPI Payment',
        'Credit Card',
        'Auto-debit',
        'Other',
      ];
      for (const name of defaults) {
        try {
          await db.runAsync(`INSERT OR IGNORE INTO categories (name) VALUES (?);`, [name]);
        } catch (e) {
          console.warn('Failed to insert default category', name, e);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to ensure default categories', e);
  }
}

// Ensure default savings account exists
async function ensureDefaultAccount() {
  const db = getDb();
  try {
    const rows = await db.getAllAsync(`SELECT COUNT(*) as count FROM accounts;`);
    const count = rows?.[0]?.count || 0;
    if (count === 0) {
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO accounts (name, account_type, is_default, auto_created, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
        ['Default Savings Account', 'savings', 1, 0, now, now]
      );
      console.log('Created default savings account');
    }
  } catch (e) {
    console.warn('Failed to ensure default account', e);
  }
}

// Account Management Functions

/**
 * Extract account information from SMS message
 * @param {string} message - SMS message body
 * @returns {Object|null} - { accountNumber, bankName, accountType } or null
 */
export const extractAccountFromSMS = (message) => {
  if (!message) return null;

  // Pattern for savings account: "HDFC Bank A/c XX1263" or "A/c XX1263"
  const savingsMatch = message.match(/(?:([A-Z\s]+Bank)\s+)?A\/c\s+(?:XX)?(\d{4})/i);
  if (savingsMatch) {
    return {
      accountNumber: savingsMatch[2],
      bankName: savingsMatch[1]?.trim() || 'Unknown Bank',
      accountType: 'savings'
    };
  }

  // Pattern for credit card: "card ending 8656" or "Credit Card ending XX1142"
  const creditCardMatch = message.match(/(?:([A-Z\s]+Bank)\s+)?(?:Credit\s+)?[Cc]ard(?:member)?\s+.*?ending\s+(?:XX)?(\d{4})/i);
  if (creditCardMatch) {
    return {
      accountNumber: creditCardMatch[2],
      bankName: creditCardMatch[1]?.trim() || extractBankFromMessage(message),
      accountType: 'credit_card'
    };
  }

  return null;
};

// Helper to extract bank name from message context
function extractBankFromMessage(message) {
  const bankPatterns = [
    /HDFC\s+Bank/i,
    /IDFC\s+(?:FIRST\s+)?Bank/i,
    /ICICI\s+Bank/i,
    /SBI/i,
    /Axis\s+Bank/i
  ];

  for (const pattern of bankPatterns) {
    const match = message.match(pattern);
    if (match) return match[0];
  }

  return 'Unknown Bank';
}

/**
 * Find or create account based on account info
 * @param {string} accountNumber - Last 4 digits of account
 * @param {string} bankName - Bank name
 * @param {string} accountType - 'savings' or 'credit_card'
 * @returns {Promise<number>} - Account ID
 */
export const findOrCreateAccount = async (accountNumber, bankName, accountType) => {
  const db = getDb();

  // Try to find existing account
  const existing = await db.getAllAsync(
    `SELECT id FROM accounts WHERE account_number = ? AND account_type = ?;`,
    [accountNumber, accountType]
  );

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create new account
  const now = new Date().toISOString();
  const name = accountType === 'savings'
    ? `${bankName} Savings (XX${accountNumber})`
    : `${bankName} Credit Card (XX${accountNumber})`;

  const result = await db.runAsync(
    `INSERT INTO accounts (name, account_number, account_type, bank_name, is_default, auto_created, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [name, accountNumber, accountType, bankName, 0, 1, now, now]
  );

  console.log(`Auto-created account: ${name}`);
  return result.lastInsertRowId;
};

/**
 * Get default account for a given type
 * @param {string} accountType - 'savings' or 'credit_card'
 * @returns {Promise<Object|null>} - Account object or null
 */
export const getDefaultAccount = async (accountType = 'savings') => {
  const db = getDb();
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM accounts WHERE account_type = ? AND is_default = 1 LIMIT 1;`,
      [accountType]
    );
    if (rows && rows.length > 0) {
      return rows[0];
    }
    // If no default, return first account of that type
    const fallback = await db.getAllAsync(
      `SELECT * FROM accounts WHERE account_type = ? LIMIT 1;`,
      [accountType]
    );
    return fallback?.[0] || null;
  } catch (e) {
    console.error('getDefaultAccount error', e);
    return null;
  }
};

/**
 * Get all accounts
 * @returns {Promise<Array>} - Array of account objects
 */
export const getAllAccounts = async () => {
  const db = getDb();
  try {
    const rows = await db.getAllAsync(`SELECT * FROM accounts ORDER BY is_default DESC, name ASC;`);
    return rows || [];
  } catch (e) {
    console.error('getAllAccounts error', e);
    return [];
  }
};

/**
 * Update account balance (for savings accounts)
 * @param {number} accountId - Account ID
 * @param {number} newBalance - New balance
 */
export const updateAccountBalance = async (accountId, newBalance) => {
  const db = getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?;`,
    [newBalance, now, accountId]
  );
};

/**
 * Set credit limit for credit card account
 * @param {number} accountId - Account ID
 * @param {number} limit - Credit limit
 */
export const setCreditLimit = async (accountId, limit) => {
  const db = getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE accounts SET credit_limit = ?, updated_at = ? WHERE id = ?;`,
    [limit, now, accountId]
  );
};

/**
 * Calculate credit card usage (spent and available)
 * @param {number} accountId - Account ID
 * @returns {Promise<Object>} - { spent, available, limit }
 */
export const calculateCreditCardUsage = async (accountId) => {
  const db = getDb();
  try {
    // Get account info
    const account = await db.getFirstAsync(`SELECT credit_limit FROM accounts WHERE id = ?;`, [accountId]);
    const limit = account?.credit_limit || 0;

    // Calculate total spent
    const spentRows = await db.getAllAsync(
      `SELECT SUM(amount) as total FROM daily_spends WHERE account_id = ?;`,
      [accountId]
    );
    const spent = spentRows?.[0]?.total || 0;

    return {
      limit,
      spent,
      available: limit - spent
    };
  } catch (e) {
    console.error('calculateCreditCardUsage error', e);
    return { limit: 0, spent: 0, available: 0 };
  }
};

/**
 * Set account as default
 * @param {number} accountId - Account ID to set as default
 */
export const setDefaultAccount = async (accountId) => {
  const db = getDb();
  const now = new Date().toISOString();

  // Get account type
  const account = await db.getFirstAsync(`SELECT account_type FROM accounts WHERE id = ?;`, [accountId]);
  if (!account) return;

  // Unset all defaults for this account type
  await db.runAsync(
    `UPDATE accounts SET is_default = 0, updated_at = ? WHERE account_type = ?;`,
    [now, account.account_type]
  );

  // Set new default
  await db.runAsync(
    `UPDATE accounts SET is_default = 1, updated_at = ? WHERE id = ?;`,
    [now, accountId]
  );
};

// Exposed helpers for categories
export const getCategories = async () => {
  const db = getDb();
  try {
    const rows = await db.getAllAsync(`SELECT * FROM categories ORDER BY name ASC;`);
    return rows || [];
  } catch (e) {
    console.error('getCategories error', e);
    return [];
  }
};

export const addCategory = async (name) => {
  const db = getDb();
  try {
    await db.runAsync(`INSERT OR IGNORE INTO categories (name) VALUES (?);`, [name]);
    // return the inserted or existing row
    const rows = await db.getAllAsync(`SELECT * FROM categories WHERE name = ?;`, [name]);
    return rows?.[0] || null;
  } catch (e) {
    console.error('addCategory error', e);
    throw e;
  }
};

export const deleteCategory = async (id) => {
  const db = getDb();
  try {
    await db.runAsync(`DELETE FROM categories WHERE id = ?;`, [id]);
    return true;
  } catch (e) {
    console.error('deleteCategory error', e);
    throw e;
  }
};

export async function updateMetadata() {
  const db = getDb();
  const fields = {
    "version": "0.0.1"
  };
  for (const [key, value] of Object.entries(fields)) {
    await db.runAsync(
      `INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);`,
      [key, value]
    );
  }
}


export const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDB first.");
  }
  return db;
};
