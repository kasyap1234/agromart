# Migration Version Fix Design Document

## Overview

This document outlines the solution to fix the migration version error in the AgroMart application where the system is incorrectly treating migration filenames as bigint values in database queries.

## Problem Analysis

### Error Details
The error occurs during application startup:
```
ERROR: invalid input syntax for type bigint: "000001_create_tenant_tables"
CONTEXT: unnamed portal parameter $1 = '...'
STATEMENT: SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)
```

### Root Cause
The issue is in the `RunMigrations` function in `internal/database/migrate.go`. The code is using the full migration filename (e.g., "000001_create_tenant_tables.up.sql") as the version identifier, but the database schema expects a numeric value for the version field.

When the golang-migrate CLI runs migrations, it stores only the numeric prefix (e.g., "000001") in the schema_migrations table. However, the application's internal migration code is trying to check for the existence of the full filename string, causing a type mismatch.

## Solution Design

### Approach
Modify the `RunMigrations` function to extract only the numeric prefix from migration filenames before using them in database queries, ensuring consistency with how golang-migrate CLI stores versions.

## Detailed Implementation

### Fix Version Extraction Logic

In `internal/database/migrate.go`, modify the version extraction to match what golang-migrate CLI stores:

```go
// Read migration files
files, err := os.ReadDir(migrationDir)
if err != nil {
    return fmt.Errorf("failed to read migration directory: %w", err)
}

// Collect migration files (only .up.sql)
migrations := []Migration{}
for _, file := range files {
    if file.IsDir() {
        continue
    }
    if strings.HasSuffix(file.Name(), ".up.sql") {
        // Extract only the numeric prefix (e.g., "000001" from "000001_create_tenant_tables.up.sql")
        filenameWithoutExt := strings.TrimSuffix(file.Name(), ".up.sql")
        parts := strings.SplitN(filenameWithoutExt, "_", 2)
        var version string
        if len(parts) > 0 {
            version = parts[0]
        } else {
            version = filenameWithoutExt
        }
        
        path := filepath.Join(migrationDir, file.Name())
        script, err := os.ReadFile(path)
        if err != nil {
            return fmt.Errorf("failed to read migration file %s: %w", path, err)
        }
        migrations = append(migrations, Migration{
            Version: version,  // Use only the numeric prefix
            Script:  string(script),
        })
    }
}
```

## Implementation Steps

1. **Modify Version Extraction**: Update the `RunMigrations` function in `internal/database/migrate.go` to extract only the numeric prefix from migration filenames
2. **Verify Migration Check**: Ensure the migration existence check uses the corrected version format
3. **Test Changes**: Verify the fix works with both fresh and existing databases

## Testing Strategy

### Unit Tests
- Test version extraction logic with various migration filename formats (e.g., "000001_create_tenant_tables.up.sql" should extract to "000001")
- Verify migration existence checking works correctly with numeric versions
- Test edge cases such as filenames without underscores

### Integration Tests
- Test with a clean database to ensure migrations apply correctly and only numeric versions are stored
- Test with an existing database to ensure no duplicate migrations occur
- Verify that the golang-migrate CLI and internal migration code work consistently

### Manual Verification
- Run the dev-start.sh script to verify the backend starts successfully
- Check that all migrations are properly tracked in the schema_migrations table

### Database Schema Verification

After applying the fix, verify that the schema_migrations table contains only numeric versions:

```sql
SELECT version, applied_at FROM schema_migrations ORDER BY version;
```

Expected output should show only numeric values like:
```
 version |         applied_at         
---------+----------------------------
 000001  | 2025-08-25 15:30:00.000000
 000002  | 2025-08-25 15:30:01.000000
 000003  | 2025-08-25 15:30:02.000000
```

Not the full filename strings like:
```
 version |         applied_at         
---------+----------------------------
 000001_create_tenant_tables  | 2025-08-25 15:30:00.000000
```

## Backward Compatibility

The fix maintains backward compatibility with existing databases that were migrated using the golang-migrate CLI, as both systems will now use the same version format (numeric prefix only).

For databases that might have been partially migrated using the internal migration code, manual cleanup may be required to ensure consistency.

## Security Considerations

No security implications as this is a data type consistency fix.

## Performance Impact

No performance impact as this only changes how version strings are processed.