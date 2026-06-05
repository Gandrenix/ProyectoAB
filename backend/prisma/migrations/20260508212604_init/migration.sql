-- CreateTable
CREATE TABLE "foods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "baseAmount" REAL NOT NULL,
    "householdMeasure" TEXT NOT NULL,
    "kcal" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "fat" REAL NOT NULL,
    "saturatedFat" REAL,
    "monounsaturatedFat" REAL,
    "polyunsaturatedFat" REAL,
    "cholesterol" REAL,
    "solubleFiber" REAL,
    "insolubleFiber" REAL,
    "totalFiber" REAL,
    "calcium" REAL,
    "phosphorus" REAL,
    "sodium" REAL,
    "potassium" REAL,
    "magnesium" REAL,
    "iron" REAL,
    "zinc" REAL,
    "copper" REAL,
    "manganese" REAL,
    "selenium" REAL,
    "vitE" REAL,
    "vitK" REAL,
    "vitD" REAL,
    "vitA" REAL,
    "vitB1" REAL,
    "vitB2" REAL,
    "vitB3" REAL,
    "vitB5" REAL,
    "vitB6" REAL,
    "vitB9" REAL,
    "vitB12" REAL,
    "vitC" REAL
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "userId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "log_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyLogId" TEXT NOT NULL,
    "foodId" INTEGER NOT NULL,
    "inputType" TEXT NOT NULL,
    "inputAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "log_entries_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "daily_logs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "log_entries_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_date_userId_key" ON "daily_logs"("date", "userId");
