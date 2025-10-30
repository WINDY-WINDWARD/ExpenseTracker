import { getDb, initDB } from "./database";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import * as Application from "expo-application";

/**
 * Updates the expenses table for recurring payments.
 * Checks if current date is after paymentDay and lastPaymentUpdate is not this month.
 * Handles months with fewer than 31 days.
 */
export async function updateRecurringExpenses() {
  console.log("updateRecurringExpenses: running");
  try {
    const db = getDb();
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // JS months are 0-based
    const currentYear = today.getFullYear();

    let expenses;
    try {
      expenses = await db.getAllAsync("SELECT * FROM expenses");
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      return;
    }

    for (const expense of expenses) {
      try {
        // Parse lastPaymentUpdate
        let lastUpdateMonth = null;
        let lastUpdateYear = null;
        if (expense.lastPaymentUpdate) {
          const [year, month] = expense.lastPaymentUpdate.split("-");
          lastUpdateYear = parseInt(year, 10);
          lastUpdateMonth = parseInt(month, 10);
        }

        // Check if payment is due this month
        const isNewMonth =
          lastUpdateMonth !== currentMonth || lastUpdateYear !== currentYear;
        let paymentDue = false;

        // Handle edge cases for paymentDay
        let paymentDay = expense.paymentDay;
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        if (paymentDay > daysInMonth) {
          paymentDay = daysInMonth; // If month has fewer days, use last day
        }

        if (currentDay >= paymentDay && isNewMonth) {
          paymentDue = true;
        }

        if (paymentDue && expense.months_left > 0) {
          // Prevent months_left from going negative
          let newMonthsLeft = expense.months_left - 1;
          if (newMonthsLeft < 0) newMonthsLeft = 0;

          await db.runAsync(
            "UPDATE expenses SET months_left = ?, lastPaymentUpdate = ? WHERE id = ?",
            [
              newMonthsLeft,
              `${currentYear}-${String(currentMonth).padStart(2, "0")}`,
              expense.id,
            ]
          );

          // If months_left is now 0, set amount to zero
          if (newMonthsLeft === 0) {
            await db.runAsync("UPDATE expenses SET amount = 0 WHERE id = ?", [
              expense.id,
            ]);
          }
        }
      } catch (err) {
        console.error(`Error updating expense id ${expense.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Unexpected error in updateRecurringExpenses:", err);
  }
}

/**
 * Resets the database by deleting all data in the income, expenses, and daily_spends tables.
 * This is a destructive operation and should only be used for testing or debugging purposes.
 * After calling this function, the app will no longer have any data and will need to be re-seeded.
 */
export async function resetDatabase() {
  try {
    const db = getDb();
    await db.execAsync("DELETE FROM income;");
    await db.execAsync("DELETE FROM expenses;");
    await db.execAsync("DELETE FROM daily_spends;");
    await db.execAsync("DELETE FROM portfolio;");
  } catch (e) {
    console.warn('Could not clear tables during reset:', e);
  }
}

export async function create_updatePortfolioBalance(newBalance) {
  const db = getDb();
  await db.runAsync("INSERT OR REPLACE INTO portfolio (id, balance) VALUES (?, ?)", [1, newBalance]);
}

export async function calculatePortfolioValue() {
  const db = getDb();
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSpends = 0;

  try {
    const incomeRows = await db.getAllAsync(
      "SELECT SUM(amount) as total FROM income;"
    );
    totalIncome = incomeRows[0]?.total || 0;
  } catch (err) {
    console.error("Failed to calculate total income:", err);
  }
  try {
    const expenseRows = await db.getAllAsync(
      "SELECT SUM(amount) as total FROM expenses;"
    );
    totalExpenses = expenseRows[0]?.total || 0;
  } catch (err) {
    console.error("Failed to calculate total expenses:", err);
  }
  try {
    const spendRows = await db.getAllAsync(
      "SELECT SUM(amount) as total FROM daily_spends;"
    );
    totalSpends = spendRows[0]?.total || 0;
  } catch (err) {
    console.error("Failed to calculate total daily spends:", err);
  }
  const netValue = totalIncome - (totalExpenses + totalSpends);

  await create_updatePortfolioBalance(netValue);
}

/**
 * Export all app data (income, expenses, daily_spends) to a JSON file and
 * open the native share dialog so the user can save/send it.
 * Returns the file URI on success.
 */
export async function exportDatabase() {
  // Ensure DB is initialized. getDb() throws if initDB wasn't called.
  let db;
  try {
    db = getDb();
  } catch (e) {
    // Try to initialize the DB and get it again
    try {
      await initDB();
      db = getDb();
    } catch (initErr) {
      console.error("Failed to initialize DB before export:", initErr);
      throw initErr;
    }
  }

  try {
    // Query each table separately and wrap with try/catch so we can
    // provide a helpful error message if a specific query fails.
    let income;
    try {
      income = await db.getAllAsync("SELECT * FROM income");
    } catch (qerr) {
      console.error("Query failed: SELECT * FROM income", qerr);
      throw new Error(`Failed to read income table: ${qerr.message || qerr}`);
    }

    let expenses;
    try {
      expenses = await db.getAllAsync("SELECT * FROM expenses");
    } catch (qerr) {
      console.error("Query failed: SELECT * FROM expenses", qerr);
      throw new Error(`Failed to read expenses table: ${qerr.message || qerr}`);
    }

    let daily_spends;
    try {
      daily_spends = await db.getAllAsync("SELECT * FROM daily_spends");
    } catch (qerr) {
      console.error("Query failed: SELECT * FROM daily_spends", qerr);
      throw new Error(
        `Failed to read daily_spends table: ${qerr.message || qerr}`
      );
    }

    let categories = [];
    try {
      categories = await db.getAllAsync("SELECT * FROM categories");
    } catch (qerr) {
      // categories table may not exist on older installs; warn but continue
      console.warn("Could not read categories table (continuing):", qerr);
      categories = [];
    }

    let metadata = [];
    try {
      metadata = await db.getAllAsync("SELECT * FROM metadata");
    } catch (qerr) {
      // metadata table may not exist on older installs; warn but continue
      console.warn("Could not read metadata table (continuing):", qerr);
      metadata = [];
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      income,
      expenses,
      daily_spends,
      categories,
      metadata,
    };

    const json = JSON.stringify(payload, null, 2);
    const fileName = `ExpenseTracker-export-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;

    // Use documentDirectory which should be available with legacy import
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    console.log("Exporting database to:", fileUri);

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share if available
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri);
    }

    return fileUri;
  } catch (err) {
    console.error("❌ Failed to export database:", err);
    throw err;
  }
}

/**
 * Import app data from a JSON file previously exported by `exportDatabase()`.
 *
 * Parameters:
 * - fileUri: string - URI to the JSON file (e.g. returned by document picker or share target)
 * - options.replaceExisting: boolean - if true (default) will delete existing data in the three tables
 *
 * Returns: { imported: { income: number, expenses: number, daily_spends: number }, fileUri }
 */
export async function importDatabase(
  fileUri,
  options = { updateExisting: true }
) {
  console.log("importDatabase: running", fileUri, options);
  const { updateExisting } = options;
  const db = getDb();

  try {
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = JSON.parse(content);

    // Basic validation and fallback to empty arrays
    const income = Array.isArray(parsed.income) ? parsed.income : [];
    const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    const daily_spends = Array.isArray(parsed.daily_spends)
      ? parsed.daily_spends
      : [];
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories
      : [];

    const summary = { income: 0, expenses: 0, daily_spends: 0, categories: 0, updated: 0 };

    // Helper to check existence by id
    const existsById = async (table, id) => {
      if (id === undefined || id === null) return false;
      const rows = await db.getAllAsync(
        `SELECT id FROM ${table} WHERE id = ?;`,
        [id]
      );
      return Array.isArray(rows) && rows.length > 0;
    };

    // Helper to update a row by id
    const updateRow = async (table, row, columns) => {
      const setClauses = columns.map((c) => `${c} = ?`).join(", ");
      const values = columns.map((c) => row[c]);
      values.push(row.id);
      const sql = `UPDATE ${table} SET ${setClauses} WHERE id = ?;`;
      await db.runAsync(sql, values);
    };

    // Helper to insert rows. By default this will include the provided `id` if
    // `includeId` is true and the row has an `id` field. When `includeId` is
    // false (used when updateExisting === false) we intentionally omit the id so
    // the database will assign a new autoincrement id and avoid PK conflicts.
    const insertRow = async (table, row, columns, includeId = true) => {
      const hasId =
        includeId && Object.prototype.hasOwnProperty.call(row, "id");
      const cols = hasId ? ["id", ...columns] : columns;
      const placeholders = cols.map(() => "?").join(",");
      const values = cols.map((c) => (c === "id" ? row.id : row[c]));
      const sql = `INSERT INTO ${table} (${cols.join(
        ","
      )}) VALUES (${placeholders});`;
      await db.runAsync(sql, values);
    };

    // Upsert logic for a set of rows
    const upsertMany = async (table, rows, columns) => {
      for (const r of rows) {
        try {
          if (updateExisting && Object.prototype.hasOwnProperty.call(r, "id")) {
            const exists = await existsById(table, r.id);
            if (exists) {
              await updateRow(table, r, columns);
              summary.updated += 1;
              continue;
            }
          }
          // Insert when not updating existing or when id not present / doesn't exist
          // If updateExisting is false, do not include the provided id so a new
          // autoincrement id is created instead of trying to insert a conflicting id.
          const includeIdForInsert =
            updateExisting && Object.prototype.hasOwnProperty.call(r, "id");
          await insertRow(table, r, columns, includeIdForInsert);
          summary[
            table === "income"
              ? "income"
              : table === "expenses"
              ? "expenses"
              : "daily_spends"
          ] += 1;
        } catch (err) {
          console.error(`Failed to upsert row into ${table}:`, r, err);
        }
      }
    };

    // Process income rows
    await upsertMany("income", income, ["source", "amount", "date"]);

  // Process categories rows first so names exist for reference if app wants to
  // maintain referential integrity outside of the DB (app currently stores names in other tables).
  await upsertMany("categories", categories, ["name"]);

    // Process expenses rows
    await upsertMany("expenses", expenses, [
      "category",
      "amount",
      "paymentDay",
      "months_left",
      "lastPaymentUpdate",
    ]);

    // Process daily_spends rows
    await upsertMany("daily_spends", daily_spends, [
      "category",
      "note",
      "amount",
      "date",
    ]);

    console.log("importDatabase: finished", summary);
    return { imported: summary, fileUri };
  } catch (err) {
    console.error("❌ Failed to import database:", err);
    throw err;
  }
}
