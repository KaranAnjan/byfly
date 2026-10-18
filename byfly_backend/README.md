# ByFly API

The API is the only service that talks to PostgreSQL. The Flutter app and the web store should use this API; AWS RDS credentials must never be shipped to a client.

## Run locally

```powershell
Copy-Item .env.example .env
go mod download
go run .
```

Set `DATABASE_URL` to the AWS RDS connection string in the deployment environment. The API automatically creates the complete schema at startup from `db/auto_create_table.go`; no separate migration command or migration folder is required.

When run locally from `byfly_backend`, the API loads the project root `.env`. It supports `AWS_HOST`, `AWS_PORT`, `AWS_DBNAME`, `AWS_USER`, `AWS_PASSWORD`, `AWS_SSLMODE`, `AWS_REGION`, and `S3_BUCKET_NAME`. AWS SDK credentials are read from `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Rotate exposed credentials and use AWS Secrets Manager or an IAM role in production.

For AWS RDS, use a private subnet/security group and enable TLS. Set `AWS_SSLMODE=verify-full` only when the RDS CA certificate is installed on the API host; `require` is a safer initial connectivity setting than disabling TLS.

Health check: `GET /healthz`

Public catalog: `GET /api/v1/categories`, `GET /api/v1/products`, `GET /api/v1/products/{id}`

Authenticated endpoints use a JWT bearer token. For a temporary local integration test, `X-User-ID` and `X-User-Email` are accepted only when `APP_ENV=development`.

## Backend layers

- `main.go` starts the application.
- `database/connection.go` opens the AWS RDS PostgreSQL pool.
- `routes/routes.go` defines all URL routes.
- `middleware/middleware.go` contains CORS, security headers, and request logging.
- `auth/auth.go` contains authentication middleware.
- `controllers/catalog.go`, `account.go`, and `orders.go` are the controllers that read and write data.
