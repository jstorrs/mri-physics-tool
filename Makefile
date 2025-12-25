.PHONY: dev build lint preview install clean deploy

# Development server with hot reload
dev:
	bun run dev

# Production build
build:
	bun run build

# Run linter
lint:
	bun run lint

# Preview production build locally
preview:
	bun run preview

# Install dependencies
install:
	bun install

# Clean build artifacts
clean:
	rm -rf dist node_modules/.vite

# Build and deploy (push triggers GitHub Actions)
deploy: build
	git add -A && git commit -m "Deploy" && git push

# Type check only (no emit)
typecheck:
	bun run tsc --noEmit

# Format check (if prettier is added later)
# format:
# 	bun run prettier --check .

help:
	@echo "Available targets:"
	@echo "  dev       - Start development server"
	@echo "  build     - Create production build"
	@echo "  lint      - Run ESLint"
	@echo "  preview   - Preview production build"
	@echo "  install   - Install dependencies"
	@echo "  clean     - Remove build artifacts"
	@echo "  deploy    - Build and push to trigger deploy"
	@echo "  typecheck - Run TypeScript type checking"
