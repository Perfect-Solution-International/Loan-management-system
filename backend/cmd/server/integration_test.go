package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"golang.org/x/crypto/bcrypt"
	"loan-management-backend/config"
	"loan-management-backend/database"
)

// Only runs with an explicitly supplied disposable database. Never uses backend/.env.
func TestFrontendAPIIntegration(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_DSN to a disposable PostgreSQL database")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	// Isolate every run in its own schema, including the receipt sequence.
	schema := fmt.Sprintf("integration_%d", os.Getpid())
	if _, err = db.Exec("CREATE SCHEMA " + schema); err != nil {
		t.Fatal(err)
	}
	defer db.Exec("DROP SCHEMA " + schema + " CASCADE")
	scoped, err := sql.Open("postgres", dsn+" search_path="+schema)
	if err != nil {
		t.Fatal(err)
	}
	defer scoped.Close()
	files, err := filepath.Glob(filepath.Join("..", "..", "database", "migrations", "*.sql"))
	if err != nil || len(files) == 0 {
		t.Fatalf("find migrations: %v (found %d)", err, len(files))
	}
	// Glob returns filename order, so referenced tables exist before their dependents.
	files = append(files, filepath.Join("..", "..", "database", "seed.sql"))
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = scoped.Exec(string(data)); err != nil {
			t.Fatalf("%s: %v", file, err)
		}
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte("Integration-test-only-123"), bcrypt.MinCost)
	if _, err = scoped.Exec(`UPDATE users SET password_hash=$1 WHERE id='STF-01'`, string(hash)); err != nil {
		t.Fatal(err)
	}
	router := newRouter(&database.DB{DB: scoped}, &config.Config{JWTSecret: "integration-test-signing-secret", AllowedOrigins: []string{"http://localhost:3000"}})
	call := func(method, path, token string, body interface{}, status int) []byte {
		t.Helper()
		payload, _ := json.Marshal(body)
		req := httptest.NewRequest(method, path, bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, req)
		if response.Code != status {
			t.Fatalf("%s %s: got %d want %d: %s", method, path, response.Code, status, response.Body.String())
		}
		return response.Body.Bytes()
	}
	decode := func(data []byte) map[string]interface{} {
		t.Helper()
		var value map[string]interface{}
		if err := json.Unmarshal(data, &value); err != nil {
			t.Fatal(err)
		}
		return value
	}
	login := decode(call("POST", "/api/auth/login", "", map[string]string{"email": "admin@psione.lk", "password": "Integration-test-only-123"}, 200))
	token := login["token"].(string)
	if login["user"].(map[string]interface{})["role"] != "Admin" {
		t.Fatal("expected Admin role")
	}
	seedCustomer := decode(call("POST", "/api/portal/login", "", map[string]string{"identifier": "customer@psione.lk", "password": "customer123"}, 200))
	seedToken := seedCustomer["token"].(string)
	call("GET", "/api/portal/me", seedToken, nil, 200)
	call("GET", "/api/users", seedToken, nil, 403)
	call("POST", "/api/auth/login", "", map[string]string{"email": "customer@psione.lk", "password": "customer123"}, 401)
	call("POST", "/api/portal/login", "", map[string]string{"identifier": "admin@psione.lk", "password": "admin123"}, 401)
	if _, err := scoped.Exec("UPDATE users SET role='Administrator' WHERE id='STF-02'"); err == nil {
		t.Fatal("legacy database role accepted")
	}
	if _, err := scoped.Exec("INSERT INTO roles(name) VALUES('Auditor')"); err == nil {
		t.Fatal("legacy catalog role accepted")
	}
	call("POST", "/api/users", token, map[string]string{"name": "Invalid Role", "email": "invalid@test.local", "password": "Invalid-test-123", "role": "Administrator"}, 400)

	call("POST", "/api/auth/login", "", map[string]string{"email": "admin@psione.lk", "password": "admin123"}, 401)
	for _, path := range []string{"/customers", "/customers/C-1", "/customers/lookup?query=C-1", "/loans", "/payments", "/online-payments", "/users", "/settings", "/audit-logs"} {
		call("GET", "/api"+path, "", nil, 401)
	}
	for _, path := range []string{"/loans", "/payments", "/online-payments"} {
		if string(bytes.TrimSpace(call("GET", "/api"+path, token, nil, 200))) != "[]" {
			t.Fatal("empty list must be []: " + path)
		}
	}
	call("GET", "/api/auth/me", token, nil, 200)
	customer := map[string]interface{}{"id": "C-1", "name": "Integration Borrower", "nic": "123456789V", "phone": "0771234567", "address": "Test address", "town": "Colombo", "district": "Colombo", "password": "Customer-test-123", "status": "Active"}
	created := decode(call("POST", "/api/customers", token, customer, 201))
	if _, ok := created["password"]; ok {
		t.Fatal("password leaked")
	}
	call("POST", "/api/customers", token, map[string]string{"id": "C-2", "name": "Second Borrower", "nic": "987654321V", "phone": "0777654321", "password": "Customer-test-123"}, 201)
	call("GET", "/api/customers/C-1", token, nil, 200)
	call("GET", "/api/customers/lookup?query=0771234567", token, nil, 200)
	call("POST", "/api/customers/C-1/documents", token, map[string]string{"id": "DOC-1", "title": "Proof", "fileUrl": "data:application/pdf;base64,VEVTVA==", "fileName": "test.pdf", "type": "other"}, 201)
	updated := decode(call("PUT", "/api/customers/C-1", token, map[string]string{"name": "Updated Borrower"}, 200))
	if updated["phone"] != "0771234567" || len(updated["documents"].([]interface{})) != 1 {
		t.Fatal("partial update lost fields/documents")
	}
	call("DELETE", "/api/customers/C-1/documents/DOC-1", token, nil, 200)
	staff := map[string]interface{}{"id": "STF-TEST", "name": "Test Officer", "email": "officer@test.local", "password": "Officer-test-123", "role": "Staff", "permissions": map[string]bool{"manageCustomers": true, "recordRepayments": true}}
	call("POST", "/api/users", token, staff, 200)
	call("GET", "/api/users", token, nil, 200)
	staffLogin := decode(call("POST", "/api/auth/login", "", map[string]string{"email": "officer@test.local", "password": "Officer-test-123"}, 200))
	staffToken := staffLogin["token"].(string)
	if staffLogin["user"].(map[string]interface{})["role"] != "Staff" {
		t.Fatal("expected Staff role")
	}
	if _, err := scoped.Exec("UPDATE users SET role='Customer' WHERE id='STF-TEST'"); err != nil {
		t.Fatal(err)
	}
	call("GET", "/api/auth/me", staffToken, nil, 401)
	if _, err := scoped.Exec("UPDATE users SET role='Staff' WHERE id='STF-TEST'"); err != nil {
		t.Fatal(err)
	}
	if _, err := scoped.Exec("UPDATE users SET status='Inactive' WHERE id='CUS-01'"); err != nil {
		t.Fatal(err)
	}
	call("GET", "/api/portal/me", seedToken, nil, 401)
	if _, err := scoped.Exec("UPDATE users SET status='Active' WHERE id='CUS-01'"); err != nil {
		t.Fatal(err)
	}

	call("PUT", "/api/settings", staffToken, map[string]string{"systemName": "Forbidden"}, 403)
	loan := map[string]interface{}{"id": "LN-TEST", "loanNo": "LN-TEST", "customerId": "C-1", "principal": 1000, "interestRate": 0, "duration": 10, "totalRepayment": 1000, "status": "Pending"}
	call("POST", "/api/loans", token, loan, 201)
	call("PATCH", "/api/loans/LN-TEST/status", staffToken, map[string]string{"status": "Active"}, 403)
	call("PATCH", "/api/loans/LN-TEST/status", token, map[string]string{"status": "Bogus"}, 400)
	approved := decode(call("PATCH", "/api/loans/LN-TEST/status", token, map[string]string{"status": "Active", "notes": "Approved after review"}, 200))
	if approved["notes"] != "Approved after review" {
		t.Fatal("approval notes lost")
	}
	call("GET", "/api/loans/LN-TEST", token, nil, 200)
	call("GET", "/api/loans?customerId=C-1", token, nil, 200)
	payment := decode(call("POST", "/api/payments", staffToken, map[string]interface{}{"id": "PAY-TEST", "loanId": "LN-TEST", "amount": 1000, "customerId": "C-2", "receiptNo": "fake"}, 201))
	if payment["customerId"] != "C-1" || payment["receiptNo"] == "fake" {
		t.Fatal("server did not enforce payment ownership/receipt")
	}
	if decode(call("GET", "/api/loans/LN-TEST", token, nil, 200))["status"] != "Completed" {
		t.Fatal("loan not settled")
	}
	call("PUT", "/api/payments/PAY-TEST", token, map[string]interface{}{"amount": 100}, 200)
	if decode(call("GET", "/api/loans/LN-TEST", token, nil, 200))["status"] != "Active" {
		t.Fatal("loan not reopened")
	}
	call("GET", "/api/payments?loanId=LN-TEST", token, nil, 200)
	call("GET", "/api/payments?customerId=C-1", token, nil, 200)
	call("DELETE", "/api/payments/PAY-TEST", token, nil, 200)
	call("DELETE", "/api/payments/PAY-TEST", token, nil, 404)
	portalLogin := decode(call("POST", "/api/portal/login", "", map[string]string{"identifier": "123456789V", "password": "Customer-test-123"}, 200))
	customerToken := portalLogin["token"].(string)
	call("GET", "/api/customers", customerToken, nil, 403)
	snapshot := decode(call("GET", "/api/portal/me", customerToken, nil, 200))
	if snapshot["customer"].(map[string]interface{})["id"] != "C-1" {
		t.Fatal("wrong borrower scope")
	}
	slip := map[string]interface{}{"id": "SLIP-TEST", "customerId": "C-1", "loanId": "LN-TEST", "amount": 1000, "bankName": "Test Bank", "slipUrl": "data:image/png;base64,VEVTVA==", "status": "COMPLETED", "reviewedBy": "forged"}
	submitted := decode(call("POST", "/api/portal/online-payments", customerToken, slip, 201))
	if submitted["status"] != "PENDING" || submitted["reviewedBy"] != nil {
		t.Fatal("caller forged approval")
	}
	call("PATCH", "/api/online-payments/SLIP-TEST/approve", customerToken, map[string]string{}, 403)
	// Exactly one competing approval succeeds, and exactly one ledger entry exists.
	var wg sync.WaitGroup
	codes := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest("PATCH", "/api/online-payments/SLIP-TEST/approve", bytes.NewBufferString(`{"notes":"verified"}`))
			req.Header.Set("Authorization", "Bearer "+token)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, req)
			codes <- response.Code
		}()
	}
	wg.Wait()
	close(codes)
	okCount, conflicts := 0, 0
	for code := range codes {
		if code == 200 {
			okCount++
		}
		if code == 409 {
			conflicts++
		}
	}
	if okCount != 1 || conflicts != 1 {
		t.Fatalf("approval statuses: successes=%d conflicts=%d", okCount, conflicts)
	}
	var count int
	if err := scoped.QueryRow(`SELECT COUNT(*) FROM payments WHERE loan_id='LN-TEST'`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("duplicate approval ledger entries: %d %v", count, err)
	}
	call("PATCH", "/api/online-payments/SLIP-TEST/reject", token, map[string]string{}, 409)
	call("GET", "/api/online-payments?customerId=C-2", token, nil, 200)
	loan["id"] = "LN-SECOND"
	loan["loanNo"] = "LN-SECOND"
	loan["status"] = "Active"
	call("POST", "/api/loans", token, loan, 201)
	slip["id"] = "SLIP-REJECT"
	slip["loanId"] = "LN-SECOND"
	call("POST", "/api/portal/online-payments", customerToken, slip, 201)
	call("PATCH", "/api/online-payments/SLIP-REJECT/reject", token, map[string]string{"notes": "invalid slip"}, 200)
	slip["id"] = "SLIP-WRONG"
	slip["customerId"] = "C-2"
	call("POST", "/api/portal/online-payments", customerToken, slip, 400)
	settings := decode(call("GET", "/api/settings", token, nil, 200))
	settings["systemName"] = "Integrated Test"
	call("PUT", "/api/settings", token, settings, 200)
	call("GET", "/api/audit-logs", token, nil, 200)
	call("PUT", "/api/users/STF-TEST", token, map[string]string{"status": "Inactive"}, 200)
	call("GET", "/api/auth/me", staffToken, nil, 401)
	registered := decode(call("POST", "/api/portal/register", "", map[string]string{"name": "Registered Customer", "username": "newcustomer", "email": "customer@test.local", "password": "Registered-test-123"}, 201))
	if registered["id"] == nil {
		t.Fatal("registration did not return id")
	}
	call("POST", "/api/portal/login", "", map[string]string{"identifier": "newcustomer", "password": "Registered-test-123"}, 200)
	call("DELETE", "/api/customers/C-2", token, nil, 200)
	call("GET", "/api/customers/C-2", token, nil, 404)
}
