package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Env, HTTPAddr, DatabaseURL, JWTSecret                            string
	DatabaseHost, DatabasePort, DatabaseName                         string
	AWSRegion, S3Bucket, S3PublicBaseURL, FirebaseServiceAccountJSON string
	MaxProductImages                                                 int
	RequestsPerSecond                                                int
	CORSOrigins                                                      []string
}

func Load() (Config, error) {
	c := Config{
		Env: os.Getenv("APP_ENV"), HTTPAddr: os.Getenv("HTTP_ADDR"),
		DatabaseURL: os.Getenv("DATABASE_URL"), JWTSecret: os.Getenv("JWT_SECRET"),
		CORSOrigins: strings.Split(os.Getenv("CORS_ORIGINS"), ","),
	}
	c.DatabaseHost = os.Getenv("AWS_HOST")
	c.DatabasePort = os.Getenv("AWS_PORT")
	c.DatabaseName = os.Getenv("AWS_DBNAME")
	c.AWSRegion = os.Getenv("AWS_REGION")
	if c.AWSRegion == "" {
		c.AWSRegion = "ap-southeast-2"
	}
	c.S3Bucket = os.Getenv("AWS_S3_BUCKET")
	if c.S3Bucket == "" {
		c.S3Bucket = os.Getenv("S3_BUCKET_NAME")
	}
	c.S3PublicBaseURL = strings.TrimRight(os.Getenv("AWS_S3_PUBLIC_BASE_URL"), "/")
	c.FirebaseServiceAccountJSON = os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
	c.MaxProductImages = 4
	if value, err := strconv.Atoi(os.Getenv("MAX_PRODUCT_IMAGES")); err == nil && value > 0 {
		c.MaxProductImages = value
	}
	c.RequestsPerSecond = 20
	if value, err := strconv.Atoi(os.Getenv("RATE_LIMIT_PER_SECOND")); err == nil && value > 0 {
		c.RequestsPerSecond = value
	}
	if c.Env == "" {
		c.Env = "development"
	}
	if c.HTTPAddr == "" {
		c.HTTPAddr = ":8080"
	}
	if c.DatabaseURL == "" {
		host, port, db, user, password := os.Getenv("AWS_HOST"), os.Getenv("AWS_PORT"), os.Getenv("AWS_DBNAME"), os.Getenv("AWS_USER"), os.Getenv("AWS_PASSWORD")
		if port == "" {
			port = "5432"
		}
		if db == "" {
			db = "postgres"
		}
		ssl := os.Getenv("AWS_SSLMODE")
		if ssl == "" {
			ssl = "require"
		}
		if host != "" && user != "" && password != "" {
			c.DatabaseURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, password, host, port, db, ssl)
		}
	}
	if c.DatabaseURL == "" {
		return c, fmt.Errorf("DATABASE_URL or AWS_* database settings are required")
	}
	if c.JWTSecret == "" && c.Env == "production" {
		return c, fmt.Errorf("JWT_SECRET is required in production")
	}
	if c.JWTSecret == "" {
		c.JWTSecret = "byfly-development-jwt-secret-change-me"
	}
	return c, nil
}

func BoolEnv(name string, fallback bool) bool {
	v, err := strconv.ParseBool(os.Getenv(name))
	if err != nil {
		return fallback
	}
	return v
}
