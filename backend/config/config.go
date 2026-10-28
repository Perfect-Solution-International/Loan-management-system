package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	Env            string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	DBSSLMode      string
	JWTSecret      string
	AllowedOrigins []string
}

func LoadConfig() *Config {
	// Try loading .env file if it exists
	_ = godotenv.Load()

	port := getEnv("PORT", "8080")
	env := getEnv("ENV", "development")

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "loan_management_db")
	dbSSL := getEnv("DB_SSLMODE", "disable")

	jwtSecret := getEnv("JWT_SECRET", "super-secret-jwt-key-loan-mgmt-system-psi-2026")
	allowed := strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"), ",")

	return &Config{
		Port:           port,
		Env:            env,
		DBHost:         dbHost,
		DBPort:         dbPort,
		DBUser:         dbUser,
		DBPassword:     dbPass,
		DBName:         dbName,
		DBSSLMode:      dbSSL,
		JWTSecret:      jwtSecret,
		AllowedOrigins: allowed,
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
