// Creates or resets an administrator explicitly; never runs during server startup.
package main

import (
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"loan-management-backend/config"
	"loan-management-backend/database"
	"loan-management-backend/models"
	"loan-management-backend/repository"
	"log"
	"os"
	"strings"
	"time"
)

func main() {
	cfg := config.LoadConfig()
	email := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || len(password) < 12 {
		log.Fatal("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before running this command")
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	users := repository.NewUserRepository(db)
	user, err := users.FindByEmail(email)
	if err != nil {
		log.Fatal(err)
	}
	exists := user != nil
	if exists && user.Role != "Admin" {
		log.Fatal("The email belongs to a non-administrator; use the staff management screen")
	}
	if !exists {
		user = &models.User{ID: "STF-" + uuid.NewString()[:8], Name: "System Administrator", Email: email, Role: "Admin", Branch: "Head Office", JoinedDate: time.Now().Format("2006-01-02")}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}
	user.PasswordHash = string(hash)
	user.Status = "Active"
	user.Permissions = models.StaffPermissions{ApproveLoans: true, RecordRepayments: true, ExportReports: true, ManageSettings: true, ManageCustomers: true}
	if exists {
		err = users.Update(user)
	} else {
		err = users.Create(user)
	}
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Administrator credentials saved")
}
