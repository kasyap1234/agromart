package main

import (
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

type MigrationFile struct {
	Version   string
	Name      string
	Type      string // "up" or "down"
	Filename  string
	Path      string
	ModTime   time.Time
}

type AppliedMigration struct {
	Version   string
	AppliedAt time.Time
}

type MigrationStatus struct {
	Version     string
	Name        string
	Status      string // "applied", "pending", "missing"
	AppliedAt   *time.Time
	FileExists  bool
	Notes       string
}

func main() {
	fmt.Println("=== MIGRATION VERIFICATION REPORT ===")
	fmt.Printf("Generated: %s\n\n", time.Now().Format("2006-01-02 15:04:05 UTC"))

	// Database credentials from .env
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "secret")
	dbName := getEnv("DB_NAME", "agromart")

	// Connect to database
	db, err := connectDatabase(dbHost, dbPort, dbUser, dbPassword, dbName)
	if err != nil {
		fmt.Printf("ERROR: Failed to connect to database: %v\n", err)
		fmt.Println("\nRecommendations:")
		fmt.Println("- Ensure PostgreSQL is running")
		fmt.Println("- Verify database credentials in .env file")
		fmt.Println("- Check if database exists")
		return
	}
	defer db.Close()

	// Read migration files
	migrationFiles, err := readMigrationFiles("../../sql/schema")
	if err != nil {
		fmt.Printf("ERROR: Failed to read migration files: %v\n", err)
		return
	}

	// Query applied migrations
	appliedMigrations, err := queryAppliedMigrations(db)
	if err != nil {
		fmt.Printf("ERROR: Failed to query applied migrations: %v\n", err)
		fmt.Println("\nPossible issues:")
		fmt.Println("- Migration tracking table might not exist")
		fmt.Println("- Database might not be migrated yet")
		return
	}

	// Generate verification report
	generateReport(migrationFiles, appliedMigrations)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func connectDatabase(host, port, user, password, dbname string) (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func readMigrationFiles(schemaPath string) ([]MigrationFile, error) {
	var files []MigrationFile

	err := filepath.WalkDir(schemaPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		filename := d.Name()
		if !strings.HasSuffix(filename, ".up.sql") && !strings.HasSuffix(filename, ".down.sql") {
			return nil
		}

		// Parse filename: 000001_create_tenant_tables.up.sql
		parts := strings.SplitN(filename, "_", 3)
		if len(parts) < 3 {
			return nil
		}

		version := parts[0]
		name := strings.TrimSuffix(strings.TrimPrefix(filename, version+"_"), ".up.sql")
		name = strings.TrimSuffix(name, ".down.sql")

		var migrationType string
		if strings.HasSuffix(filename, ".up.sql") {
			migrationType = "up"
		} else {
			migrationType = "down"
		}

		info, err := d.Info()
		if err != nil {
			return err
		}

		file := MigrationFile{
			Version:  version,
			Name:     name,
			Type:     migrationType,
			Filename: filename,
			Path:     path,
			ModTime:  info.ModTime(),
		}

		files = append(files, file)
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Sort by version
	sort.Slice(files, func(i, j int) bool {
		return files[i].Version < files[j].Version
	})

	return files, nil
}

func queryAppliedMigrations(db *sql.DB) ([]AppliedMigration, error) {
	// Try common migration table names
	tableNames := []string{"schema_migrations", "migrations", "gorp_migrations"}

	var appliedMigrations []AppliedMigration

	for _, tableName := range tableNames {
		query := fmt.Sprintf("SELECT version, applied_at FROM %s ORDER BY version", tableName)

		rows, err := db.Query(query)
		if err != nil {
			continue // Try next table name
		}
		defer rows.Close()

		for rows.Next() {
			var version string
			var appliedAt time.Time

			if err := rows.Scan(&version, &appliedAt); err != nil {
				continue
			}

			appliedMigrations = append(appliedMigrations, AppliedMigration{
				Version:   version,
				AppliedAt: appliedAt,
			})
		}

		if len(appliedMigrations) > 0 {
			fmt.Printf("Found migration tracking table: %s\n\n", tableName)
			break
		}
	}

	return appliedMigrations, nil
}

func generateReport(migrationFiles []MigrationFile, appliedMigrations []AppliedMigration) {
	// Create a map of applied migrations for easy lookup
	appliedMap := make(map[string]AppliedMigration)
	for _, applied := range appliedMigrations {
		appliedMap[applied.Version] = applied
	}

	// Group migration files by version
	versionMap := make(map[string][]MigrationFile)
	for _, file := range migrationFiles {
		versionMap[file.Version] = append(versionMap[file.Version], file)
	}

	// Create migration status list
	var statuses []MigrationStatus

	// Process each migration file version
	for version, files := range versionMap {
		var status MigrationStatus
		status.Version = version
		status.FileExists = true
		status.Name = files[0].Name

		// Check if this version is applied (exact match)
		if applied, exists := appliedMap[version]; exists {
			status.Status = "applied"
			status.AppliedAt = &applied.AppliedAt
		} else {
			// Check if a version starting with this number is applied (handles naming differences)
			found := false
			for appliedVersion, applied := range appliedMap {
				if strings.HasPrefix(appliedVersion, version) || strings.HasPrefix(version, appliedVersion) {
					status.Status = "applied"
					status.AppliedAt = &applied.AppliedAt
					status.Notes = fmt.Sprintf("Matched with database version: %s", appliedVersion)
					found = true
					break
				}
			}
			if !found {
				status.Status = "pending"
				status.Notes = "Migration file exists but not applied"
			}
		}

		statuses = append(statuses, status)
	}

	// Check for migrations that exist in database but not in files
	for appliedVersion, applied := range appliedMap {
		found := false
		for _, status := range statuses {
			if strings.HasPrefix(appliedVersion, status.Version) || strings.HasPrefix(status.Version, appliedVersion) {
				found = true
				break
			}
		}
		if !found {
			var status MigrationStatus
			status.Version = appliedVersion
			status.Name = "unknown"
			status.Status = "missing"
			status.AppliedAt = &applied.AppliedAt
			status.FileExists = false
			status.Notes = "Migration applied in database but no corresponding file found"
			statuses = append(statuses, status)
		}
	}

	// Sort statuses by version
	sort.Slice(statuses, func(i, j int) bool {
		return statuses[i].Version < statuses[j].Version
	})

	// Generate report
	fmt.Println("=== MIGRATION SUMMARY ===")
	fmt.Printf("Total migration files found: %d\n", len(migrationFiles))
	fmt.Printf("Total applied migrations: %d\n", len(appliedMigrations))
	fmt.Printf("Total unique versions: %d\n\n", len(statuses))

	// Count by status
	appliedCount := 0
	pendingCount := 0
	missingCount := 0

	for _, status := range statuses {
		switch status.Status {
		case "applied":
			appliedCount++
		case "pending":
			pendingCount++
		case "missing":
			missingCount++
		}
	}

	fmt.Println("=== MIGRATION STATUS COUNTS ===")
	fmt.Printf("✅ Applied: %d\n", appliedCount)
	fmt.Printf("⏳ Pending: %d\n", pendingCount)
	fmt.Printf("❌ Missing: %d\n\n", missingCount)

	fmt.Println("=== DETAILED MIGRATION STATUS ===")
	fmt.Printf("%-8s %-40s %-10s %-20s %-15s %s\n", "Version", "Name", "Status", "Applied At", "Files", "Notes")
	fmt.Println(strings.Repeat("-", 120))

	for _, status := range statuses {
		appliedAtStr := ""
		if status.AppliedAt != nil {
			appliedAtStr = status.AppliedAt.Format("2006-01-02 15:04:05")
		}

		fileCount := "No"
		if status.FileExists {
			files := versionMap[status.Version]
			if len(files) == 2 {
				fileCount = "Both"
			} else if len(files) == 1 {
				if files[0].Type == "up" {
					fileCount = "Up only"
				} else {
					fileCount = "Down only"
				}
			}
		}

		fmt.Printf("%-8s %-40s %-10s %-20s %-15s %s\n",
			status.Version,
			truncate(status.Name, 40),
			status.Status,
			appliedAtStr,
			fileCount,
			status.Notes)
	}

	fmt.Println("\n=== MIGRATION FILES DETAILS ===")
	for _, status := range statuses {
		if !status.FileExists {
			continue
		}

		files := versionMap[status.Version]
		if len(files) == 0 {
			continue
		}

		fmt.Printf("\nVersion %s:\n", status.Version)
		for _, file := range files {
			fmt.Printf("  %s (%s) - Modified: %s\n",
				file.Filename,
				file.Type,
				file.ModTime.Format("2006-01-02 15:04:05"))
		}
	}

	fmt.Println("\n=== RECOMMENDATIONS ===")

	if pendingCount > 0 {
		fmt.Printf("⚠️  %d pending migrations found. Consider applying them:\n", pendingCount)
		for _, status := range statuses {
			if status.Status == "pending" {
				fmt.Printf("   - Apply migration %s: %s\n", status.Version, status.Name)
			}
		}
		fmt.Println()
	}

	if missingCount > 0 {
		fmt.Printf("❌ %d missing migration files found. This may indicate:\n", missingCount)
		fmt.Println("   - Migration files were deleted after being applied")
		fmt.Println("   - Version mismatch between files and database")
		fmt.Println("   - Manual database changes")
		fmt.Println("   Consider investigating these discrepancies.\n")
	}

	if pendingCount == 0 && missingCount == 0 {
		fmt.Println("✅ All migrations are properly synchronized!")
	}

	fmt.Println("\n=== END OF REPORT ===")
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}