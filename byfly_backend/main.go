package main

import (
	"context"
	"log"
	"net/http"
	"time"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/byfly/byfly-backend/auth"
	"github.com/byfly/byfly-backend/config"
	"github.com/byfly/byfly-backend/controllers"
	"github.com/byfly/byfly-backend/db"
	"github.com/byfly/byfly-backend/routes"
	"github.com/byfly/byfly-backend/service"
	"github.com/byfly/byfly-backend/storage"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
)

// main is the single application entry point. It loads configuration,
// opens PostgreSQL, builds the HTTP routes, and starts the API server.
func main() {
	// Load the existing project .env when running locally. Production should
	// provide AWS_* values through the process environment/secrets manager.
	_ = godotenv.Load(".env", "../.env")
	c, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	pool, err := db.Open(context.Background(), c.DatabaseURL)
	if err != nil {
		log.Fatal("database connection failed: ", err)
	}
	defer pool.Close()
	log.Printf("database connection established: AWS PostgreSQL (%s:%s/%s)", c.DatabaseHost, c.DatabasePort, c.DatabaseName)
	if err := db.EnsureSchema(context.Background(), pool, c.MaxProductImages); err != nil {
		log.Fatal("database schema setup failed: ", err)
	}
	log.Println("database schema verified: all ByFly tables are ready")
	if err := auth.SeedSuperadmins(context.Background(), pool); err != nil {
		log.Fatal("superadmin seed failed: ", err)
	}
	log.Println("superadmin accounts verified")

	server := &service.Server{DB: pool}
	s3Store, err := storage.New(context.Background(), c.AWSRegion, c.S3Bucket, c.S3PublicBaseURL)
	if err != nil {
		log.Printf("S3 uploads disabled: %v", err)
	}
	var firebaseAuth *firebaseauth.Client
	if c.FirebaseServiceAccountJSON != "" {
		firebaseApp, firebaseErr := firebase.NewApp(context.Background(), nil, option.WithCredentialsFile(c.FirebaseServiceAccountJSON))
		if firebaseErr != nil {
			log.Fatal("Firebase Admin setup failed: ", firebaseErr)
		}
		firebaseAuth, firebaseErr = firebaseApp.Auth(context.Background())
		if firebaseErr != nil {
			log.Fatal("Firebase Admin auth setup failed: ", firebaseErr)
		}
		log.Println("Firebase Admin authentication verified")
	}
	controller := &controllers.Controller{DB: pool, S3: s3Store, JWTSecret: c.JWTSecret, FirebaseAuth: firebaseAuth, MaxProductImages: c.MaxProductImages}
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Logger(), gin.Recovery())
	engine.Any("/*path", gin.WrapH(routes.New(server, controller, c)))
	h := &http.Server{
		Addr:              c.HTTPAddr,
		Handler:           engine,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("ByFly API listening on %s (%s)", c.HTTPAddr, c.Env)
	if err := h.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
