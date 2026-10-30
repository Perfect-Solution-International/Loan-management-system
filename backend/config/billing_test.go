package config

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestOnePayEnvironmentIsNotRewritten(t *testing.T) {
	t.Setenv("BILLING_PROVIDER", "")
	t.Setenv("ONEPAY_APP_ID", "fixture-app")
	t.Setenv("ONEPAY_HASH_SALT", "fixture-salt")
	t.Setenv("ONEPAY_RETURN_URL", "http://localhost:3000")
	t.Setenv("ONEPAY_RETURN_BASE_URL", "")
	c := LoadConfig()
	if c.BillingProviderName() != "onepay" {
		t.Fatal("saved credentials were not detected")
	}
	if c.OnePayReturnURL != "http://localhost:3000" {
		t.Fatal("return URL was silently rewritten")
	}
	t.Setenv("ONEPAY_RETURN_URL", "")
	if LoadConfig().OnePayReturnURL != "" {
		t.Fatal("missing return URL was invented")
	}
	t.Setenv("BILLING_PROVIDER", " disabled ")
	if LoadConfig().BillingProviderName() != "disabled" {
		t.Fatal("explicit opt-out ignored")
	}
}

func TestOnePayReturnBaseAndAPIConfiguration(t *testing.T) {
	t.Setenv("ONEPAY_RETURN_URL", "")
	t.Setenv("ONEPAY_RETURN_BASE_URL", "http://localhost:3000/")
	t.Setenv("ONEPAY_API_BASE", "https://api.onepay.lk/")
	c := LoadConfig()
	if c.OnePayAPIBase != "https://api.onepay.lk" || c.OnePayReturnURL != "http://localhost:3000/dashboard/billing/success" {
		t.Fatal("OnePay environment aliases were not loaded correctly")
	}
	t.Setenv("ONEPAY_RETURN_URL", "https://configured.example/dashboard/billing/success")
	if LoadConfig().OnePayReturnURL != "https://configured.example/dashboard/billing/success" {
		t.Fatal("explicit return URL must take precedence over base URL")
	}
}

func TestLoadRootBackendEnvironment(t *testing.T) {
	if os.Getenv("PSIONE_ENV_CHILD") == "1" {
		c := LoadConfig()
		if c.DBName != "fixture_db" || c.OnePayAppID != "fixture-app" || c.OnePayHashSalt != "fixture-salt" || c.OnePayAppToken != "fixture-token" || c.OnePayAPIBase != "https://api.onepay.lk" {
			t.Fatal("backend/.env was not loaded when root .env was absent")
		}
		return
	}
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "backend"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "backend", ".env"), []byte("DB_NAME=fixture_db\nONEPAY_APP_ID=fixture-app\nONEPAY_HASH_SALT=fixture-salt\nONEPAY_APP_TOKEN=fixture-token\nONEPAY_API_BASE=https://api.onepay.lk\n"), 0600); err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(os.Args[0], "-test.run=^TestLoadRootBackendEnvironment$")
	cmd.Dir = root
	for _, entry := range os.Environ() {
		key := strings.SplitN(entry, "=", 2)[0]
		if !strings.HasPrefix(key, "ONEPAY_") && key != "DB_NAME" && key != "PSIONE_ENV_CHILD" {
			cmd.Env = append(cmd.Env, entry)
		}
	}
	cmd.Env = append(cmd.Env, "PSIONE_ENV_CHILD=1")
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("environment loading: %v\n%s", err, output)
	}
}
