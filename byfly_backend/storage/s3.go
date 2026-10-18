package storage

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"io"
	"strings"
	"unicode"
	"unicode/utf8"
)

type S3 struct {
	client                        *s3.Client
	bucket, region, publicBaseURL string
}

func New(ctx context.Context, region, bucket, publicBaseURL string) (*S3, error) {
	if region == "" || bucket == "" {
		return nil, fmt.Errorf("AWS_REGION and AWS_S3_BUCKET are required for image uploads")
	}
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(region))
	if err != nil {
		return nil, err
	}
	return &S3{client: s3.NewFromConfig(cfg), bucket: bucket, region: region, publicBaseURL: strings.TrimRight(publicBaseURL, "/")}, nil
}
func (s *S3) Upload(ctx context.Context, key, contentType string, body io.Reader) (string, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key), Body: body, ContentType: aws.String(contentType)})
	if err != nil {
		return "", err
	}
	if s.publicBaseURL != "" {
		return s.publicBaseURL + "/" + key, nil
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key), nil
}

// GetObject opens an image for the public API proxy. This keeps the bucket
// private while allowing the storefront to display uploaded product images.
func (s *S3) GetObject(ctx context.Context, key string) (io.ReadCloser, string, error) {
	key = strings.TrimPrefix(key, "/")
	keys := []string{key}
	// Older uploads can contain a UTF-8/Windows filename encoding mismatch.
	// Try the repaired form as a compatibility fallback.
	if repaired := repairMojibake(key); repaired != key {
		keys = append(keys, repaired)
	}
	var result *s3.GetObjectOutput
	var err error
	for _, candidate := range keys {
		result, err = s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(candidate)})
		if err == nil {
			break
		}
	}
	// Some older uploads were saved with filenames whose punctuation or
	// Unicode encoding changed while the product URL was stored. If the exact
	// key is missing, find the matching object in the same product folder by a
	// normalized key before returning 404.
	if err != nil {
		prefix := key
		if slash := strings.LastIndex(prefix, "/"); slash >= 0 {
			prefix = prefix[:slash+1]
		}
		listed, listErr := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{Bucket: aws.String(s.bucket), Prefix: aws.String(prefix)})
		if listErr == nil {
			target := normalizeObjectKey(key)
		targetName := key[strings.LastIndex(key, "/")+1:]
		targetPrefix := ""
		if dash := strings.Index(targetName, "-"); dash > 0 {
			targetPrefix = targetName[:dash] + "-"
		}
			for _, object := range listed.Contents {
				if object.Key == nil {
					continue
				}
				objectName := (*object.Key)[strings.LastIndex(*object.Key, "/")+1:]
				prefixMatch := targetPrefix != "" && strings.HasPrefix(objectName, targetPrefix)
				if normalizeObjectKey(*object.Key) != target && !prefixMatch {
					continue
				}
				result, err = s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: object.Key})
				if err == nil {
					break
				}
			}
		}
	}
	if err != nil {
		return nil, "", err
	}
	contentType := "application/octet-stream"
	if result.ContentType != nil && *result.ContentType != "" {
		contentType = *result.ContentType
	}
	return result.Body, contentType, nil
}

func normalizeObjectKey(value string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(value) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func repairMojibake(value string) string {
	var raw []byte
	for _, r := range value {
		if r <= 255 {
			raw = append(raw, byte(r))
		} else {
			raw = append(raw, string(r)...)
		}
	}
	if utf8.Valid(raw) {
		return string(raw)
	}
	return value
}
