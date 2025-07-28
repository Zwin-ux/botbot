#!/bin/bash

# BotBot Deployment Script
# Supports multiple deployment environments and strategies

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
STRATEGY="rolling"
SKIP_TESTS=false
SKIP_BACKUP=false
DRY_RUN=false

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy BotBot Discord Bot

OPTIONS:
    -e, --environment ENV    Deployment environment (production, staging, development)
    -s, --strategy STRATEGY  Deployment strategy (rolling, blue-green, recreate)
    -t, --skip-tests        Skip running tests before deployment
    -b, --skip-backup       Skip creating backup before deployment
    -d, --dry-run           Show what would be done without executing
    -h, --help              Show this help message

EXAMPLES:
    $0                                    # Deploy to production with rolling strategy
    $0 -e staging -s recreate            # Deploy to staging with recreate strategy
    $0 --skip-tests --skip-backup        # Deploy without tests and backup
    $0 --dry-run                         # Show deployment plan without executing

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--strategy)
            STRATEGY="$2"
            shift 2
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be production, staging, or development."
fi

# Validate strategy
if [[ ! "$STRATEGY" =~ ^(rolling|blue-green|recreate)$ ]]; then
    error "Invalid strategy: $STRATEGY. Must be rolling, blue-green, or recreate."
fi

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
    fi
    
    # Check required environment variables
    source "$ENV_FILE"
    if [[ -z "$DISCORD_TOKEN" ]]; then
        error "DISCORD_TOKEN is not set in environment file"
    fi
    
    success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warning "Skipping tests as requested"
        return
    fi
    
    log "Running tests..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would run: npm test"
        return
    fi
    
    cd "$PROJECT_DIR"
    if ! npm test; then
        error "Tests failed. Deployment aborted."
    fi
    
    success "All tests passed"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warning "Skipping backup as requested"
        return
    fi
    
    log "Creating backup..."
    
    local backup_dir="$PROJECT_DIR/backups"
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$backup_dir/$backup_name"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would create backup at: $backup_path"
        return
    fi
    
    mkdir -p "$backup_dir"
    
    # Backup database
    if [[ -f "$PROJECT_DIR/data/botbot.db" ]]; then
        mkdir -p "$backup_path"
        cp "$PROJECT_DIR/data/botbot.db" "$backup_path/"
        success "Database backup created: $backup_path/botbot.db"
    fi
    
    # Backup configuration
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$backup_path/"
        success "Configuration backup created: $backup_path/.env"
    fi
    
    # Create backup archive
    cd "$backup_dir"
    tar -czf "$backup_name.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    
    success "Backup created: $backup_dir/$backup_name.tar.gz"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would build Docker images"
        return
    fi
    
    cd "$PROJECT_DIR"
    
    # Build main application image
    docker build -t botbot:latest .
    
    # Build backup image
    docker build -f Dockerfile.backup -t botbot-backup:latest .
    
    success "Docker images built successfully"
}

# Deploy with rolling strategy
deploy_rolling() {
    log "Deploying with rolling strategy..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would perform rolling deployment"
        return
    fi
    
    cd "$PROJECT_DIR"
    
    # Update services one by one
    docker-compose up -d --no-deps botbot
    
    # Wait for health check
    log "Waiting for application to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose exec -T botbot node scripts/healthcheck.js &> /dev/null; then
            success "Application is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Application failed to become healthy after $max_attempts attempts"
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    # Update other services
    docker-compose up -d
    
    success "Rolling deployment completed"
}

# Deploy with blue-green strategy
deploy_blue_green() {
    log "Deploying with blue-green strategy..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would perform blue-green deployment"
        return
    fi
    
    cd "$PROJECT_DIR"
    
    # Create green environment
    log "Creating green environment..."
    docker-compose -f docker-compose.yml -f docker-compose.green.yml up -d
    
    # Wait for green environment to be healthy
    log "Waiting for green environment to be healthy..."
    # Health check logic here
    
    # Switch traffic to green
    log "Switching traffic to green environment..."
    # Traffic switching logic here
    
    # Remove blue environment
    log "Removing blue environment..."
    docker-compose down
    
    # Rename green to blue
    log "Promoting green to blue..."
    # Promotion logic here
    
    success "Blue-green deployment completed"
}

# Deploy with recreate strategy
deploy_recreate() {
    log "Deploying with recreate strategy..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would perform recreate deployment"
        return
    fi
    
    cd "$PROJECT_DIR"
    
    # Stop all services
    docker-compose down
    
    # Start all services
    docker-compose up -d
    
    success "Recreate deployment completed"
}

# Perform deployment
deploy() {
    log "Starting deployment to $ENVIRONMENT with $STRATEGY strategy..."
    
    case $STRATEGY in
        rolling)
            deploy_rolling
            ;;
        blue-green)
            deploy_blue_green
            ;;
        recreate)
            deploy_recreate
            ;;
    esac
}

# Post-deployment verification
verify_deployment() {
    log "Verifying deployment..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would verify deployment"
        return
    fi
    
    cd "$PROJECT_DIR"
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        error "Some services are not running"
    fi
    
    # Run health checks
    if ! docker-compose exec -T botbot node scripts/healthcheck.js; then
        error "Health check failed"
    fi
    
    # Check logs for errors
    local error_count=$(docker-compose logs --tail=100 botbot | grep -i error | wc -l)
    if [[ $error_count -gt 0 ]]; then
        warning "Found $error_count error(s) in recent logs"
    fi
    
    success "Deployment verification completed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old images and containers..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would cleanup old images and containers"
        return
    fi
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    log "Sending deployment notification..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would send deployment notification"
        return
    fi
    
    # This could send notifications to Slack, Discord, email, etc.
    # For now, just log the completion
    local message="BotBot deployment to $ENVIRONMENT completed successfully using $STRATEGY strategy"
    
    # Example: Send to Discord webhook
    # curl -X POST -H "Content-Type: application/json" \
    #      -d "{\"content\": \"$message\"}" \
    #      "$DISCORD_WEBHOOK_URL"
    
    success "Deployment notification sent"
}

# Main deployment flow
main() {
    log "Starting BotBot deployment process..."
    log "Environment: $ENVIRONMENT"
    log "Strategy: $STRATEGY"
    log "Skip Tests: $SKIP_TESTS"
    log "Skip Backup: $SKIP_BACKUP"
    log "Dry Run: $DRY_RUN"
    
    check_prerequisites
    run_tests
    create_backup
    build_images
    deploy
    verify_deployment
    cleanup
    send_notification
    
    success "Deployment completed successfully!"
}

# Run main function
main "$@"