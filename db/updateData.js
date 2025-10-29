import { getDb } from "./database";

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

export async function resetDatabase() {
  const db = getDb();
  await db.execAsync("DELETE FROM income;");
  await db.execAsync("DELETE FROM expenses;");
  await db.execAsync("DELETE FROM daily_spends;");
}
