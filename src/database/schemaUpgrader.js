/**
 * Handles database schema migrations and upgrades
 */
class SchemaUpgrader {
  constructor(db) {
    this.db = db;
  }

  /**
   * Apply all schema upgrades
   */
  async upgrade() {
    return new Promise((resolve, reject) => {
      // Run all upgrades in a transaction
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");

        try {
          // Check if we need to add the category fields
          this.db.get("PRAGMA table_info(reminders)", (err, row) => {
            if (err) {
              this.db.run("ROLLBACK");
              return reject(err);
            }

            // If categoryId column doesn't exist, add it (and priority)
            if (!row || !row.find((col) => col.name === "categoryId")) {
              console.log("Upgrading database schema: Adding category support");

              // Add categoryId and priority to reminders
              this.db.run(
                `ALTER TABLE reminders ADD COLUMN categoryId INTEGER`,
              );
              this.db.run(
                `ALTER TABLE reminders ADD COLUMN priority INTEGER DEFAULT 0`,
              );

              // Create categories table if it doesn't exist
              this.db.run(`CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                emoji TEXT NOT NULL,
                description TEXT,
                createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
              )`);

              // Create reactions table for voting if it doesn't exist
              this.db.run(`CREATE TABLE IF NOT EXISTS reactions (
                reminderId INTEGER NOT NULL,
                userId TEXT NOT NULL,
                emoji TEXT NOT NULL,
                addedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
                PRIMARY KEY (reminderId, userId, emoji),
                FOREIGN KEY(reminderId) REFERENCES reminders(id)
              )`);

              // Create subscriptions table if it doesn't exist
              this.db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
                userId TEXT NOT NULL,
                categoryId INTEGER NOT NULL,
                addedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
                PRIMARY KEY (userId, categoryId),
                FOREIGN KEY(categoryId) REFERENCES categories(id)
              )`);

              // Add default categories
              const defaultCategories = [
                {
                  name: "General",
                  emoji: "📝",
                  description: "General reminders",
                },
                {
                  name: "Personal",
                  emoji: "👤",
                  description: "Personal tasks and reminders",
                },
                {
                  name: "Work",
                  emoji: "💼",
                  description: "Work-related tasks",
                },
                {
                  name: "Urgent",
                  emoji: "🚨",
                  description: "High priority tasks",
                },
                {
                  name: "Project",
                  emoji: "🚀",
                  description: "Project-related tasks",
                },
              ];

              const stmt = this.db.prepare(
                "INSERT INTO categories (name, emoji, description) VALUES (?, ?, ?)",
              );
              defaultCategories.forEach((category) => {
                stmt.run(category.name, category.emoji, category.description);
              });
              stmt.finalize();

              console.log("Added default categories");
            }
          });

          this.db.run("COMMIT", (err) => {
            if (err) {
              this.db.run("ROLLBACK");
              return reject(err);
            }
            resolve();
          });
        } catch (error) {
          this.db.run("ROLLBACK");
          reject(error);
        }
      });
    });
  }
}

module.exports = SchemaUpgrader;
