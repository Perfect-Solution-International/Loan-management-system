// Explicitly provisions a separate SaaS platform identity. Never runs at startup.
package main

import (
	"log"
	"net/mail"
	"os"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"loan-management-backend/config"
	"loan-management-backend/database"
)

func main() {
	cfg := config.LoadConfig()
	email := strings.ToLower(strings.TrimSpace(os.Getenv("PLATFORM_ADMIN_EMAIL")))
	password := os.Getenv("PLATFORM_ADMIN_PASSWORD")
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email || len(password) < 12 || len(password) > 72 {
		log.Fatal("Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD (12 to 72 characters)")
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}
	_, err = db.Exec(`INSERT INTO platform_administrators(id,email,name,password_hash) VALUES($1,$2,'Platform Administrator',$3) ON CONFLICT(LOWER(email)) DO UPDATE SET password_hash=EXCLUDED.password_hash,active=true`, uuid.NewString(), email, string(hash))
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Platform administrator provisioned. Sign in at /platform/login.")
}
