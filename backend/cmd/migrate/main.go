// Versioned, transactional SQL migrations; never seeds default accounts.
package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"log"
	"os"
	"path/filepath"

	"loan-management-backend/config"
	"loan-management-backend/database"
)

func main() {
	db, err := database.Connect(config.LoadConfig())
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	if _, err = db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`); err != nil {
		log.Fatal(err)
	}
	files, err := filepath.Glob("database/migrations/*.sql")
	if err != nil || len(files) == 0 {
		log.Fatal("Run from backend; no migration files found")
	}
	for _, file := range files {
		contents, err := os.ReadFile(file)
		if err != nil {
			log.Fatal(err)
		}
		sum := sha256.Sum256(contents)
		checksum := hex.EncodeToString(sum[:])
		name := filepath.Base(file)
		tx, err := db.Begin()
		if err != nil {
			log.Fatal(err)
		}
		if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(735429817)`); err != nil {
			tx.Rollback()
			log.Fatal(err)
		}
		var existing string
		err = tx.QueryRow(`SELECT checksum FROM schema_migrations WHERE name=$1`, name).Scan(&existing)
		if err == nil {
			tx.Rollback()
			if existing != checksum {
				log.Fatalf("Migration checksum mismatch: %s; restore its exact applied bytes", name)
			}
			continue
		}
		if err != sql.ErrNoRows {
			tx.Rollback()
			log.Fatal(err)
		}
		if _, err = tx.Exec(string(contents)); err != nil {
			tx.Rollback()
			log.Fatalf("%s: %v", name, err)
		}
		if _, err = tx.Exec(`INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)`, name, checksum); err != nil {
			tx.Rollback()
			log.Fatal(err)
		}
		if err = tx.Commit(); err != nil {
			log.Fatal(err)
		}
		log.Printf("Applied %s", name)
	}
}
