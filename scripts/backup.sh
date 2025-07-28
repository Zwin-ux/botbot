#!/bin/bash

# BotBot Backup Script
# Creates comprehensive backups of database, configuration, and logs

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DATA_DIR="${DATA_DIR:-$PROJECT_DIR/data}"
LOGS_DIR="${LOGS_DIR:-$PROJECT_DIR/logs}"

# Backup settings
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESS_BACKUPS="${COMPRESS_BACKUPS:-true}"
ENCRYPT_BACKUPS="${ENCRYPT_BACKUPS:-false}"
UPLOAD_TO_S3="${UPLOAD_TO_S3:-false}"

# S3 Configuration
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-botbot-backups}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Create backup directory
create_backup_dir() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="botbot_backup_$timestamp"
    CURRENT_BACKUP_DIR="$BACKUP_DIR/$backup_name"
    
    log "Creating backup directory: $CURRENT_BACKUP_DIR"
    mkdir -p "$CURRENT_BACKUP_DIR"
    
    # Create subdirectories
    mkdir -p "$CURRENT_BACKUP_DIR/data"
    mkdir -p "$CURRENT_BACKUP_DIR/logs"
    mkdir -p "$CURRENT_BACKUP_DIR/config"
    mkdir -p "$CURRENT_BACKUP_DIR/metadata"
}

# Backup database
backup_database() {
    log "Backing up database..."
    
    local db_file="$DATA_DIR/botbot.db"
    if [[ -f "$db_file" ]]; then
        # Create SQLite backup
        sqlite3 "$db_file" ".backup '$CURRENT_BACKUP_DIR/data/botbot.db'"
        
        # Create SQL dump as well
        sqlite3 "$db_file" ".dump" > "$CURRENT_BACKUP_DIR/data/botbot.sql"
        
        # Get database statistics
        local db_size=$(stat -f%z "$db_file" 2>/dev/null || stat -c%s "$db_file" 2>/dev/null || echo "unknown")
        local table_count=$(sqlite3 "$db_file" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
        
        echo "Database size: $db_size bytes" > "$CURRENT_BACKUP_DIR/metadata/database_info.txt"
        echo "Table count: $table_count" >> "$CURRENT_BACKUP_DIR/metadata/database_info.txt"
        echo "Backup time: $(date)" >> "$CURRENT_BACKUP_DIR/metadata/database_info.txt"
        
        success "Database backup completed"
    else
        warning "Database file not found: $db_file"
    fi
}

# Backup configuration files
backup_config() {
    log "Backing up configuration files..."
    
    # Backup environment file (without sensitive data)
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        # Create sanitized version of .env file
        grep -v -E "(TOKEN|PASSWORD|SECRET|KEY)" "$PROJECT_DIR/.env" > "$CURRENT_BACKUP_DIR/config/env_sanitized.txt" || true
        echo "Environment file backed up (sanitized)" >> "$CURRENT_BACKUP_DIR/metadata/config_info.txt"
    fi
    
    # Backup package.json
    if [[ -f "$PROJECT_DIR/package.json" ]]; then
        cp "$PROJECT_DIR/package.json" "$CURRENT_BACKUP_DIR/config/"
        echo "Package.json backed up" >> "$CURRENT_BACKUP_DIR/metadata/config_info.txt"
    fi
    
    # Backup Docker configuration
    if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
        cp "$PROJECT_DIR/docker-compose.yml" "$CURRENT_BACKUP_DIR/config/"
        echo "Docker Compose configuration backed up" >> "$CURRENT_BACKUP_DIR/metadata/config_info.txt"
    fi
    
    # Backup any custom configuration files
    if [[ -d "$PROJECT_DIR/config" ]]; then
        cp -r "$PROJECT_DIR/config" "$CURRENT_BACKUP_DIR/"
        echo "Custom configuration directory backed up" >> "$CURRENT_BACKUP_DIR/metadata/config_info.txt"
    fi
    
    success "Configuration backup completed"
}

# Backup logs
backup_logs() {
    log "Backing up logs..."
    
    if [[ -d "$LOGS_DIR" ]]; then
        # Copy recent logs (last 7 days)
        find "$LOGS_DIR" -name "*.log" -mtime -7 -exec cp {} "$CURRENT_BACKUP_DIR/logs/" \;
        
        # Create log summary
        local log_count=$(find "$LOGS_DIR" -name "*.log" -mtime -7 | wc -l)
        local total_size=$(find "$LOGS_DIR" -name "*.log" -mtime -7 -exec stat -f%z {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "unknown")
        
        echo "Log files backed up: $log_count" > "$CURRENT_BACKUP_DIR/metadata/logs_info.txt"
        echo "Total log size: $total_size bytes" >> "$CURRENT_BACKUP_DIR/metadata/logs_info.txt"
        echo "Backup time: $(date)" >> "$CURRENT_BACKUP_DIR/metadata/logs_info.txt"
        
        success "Logs backup completed"
    else
        warning "Logs directory not found: $LOGS_DIR"
    fi
}

# Create backup metadata
create_metadata() {
    log "Creating backup metadata..."
    
    local metadata_file="$CURRENT_BACKUP_DIR/metadata/backup_info.txt"
    
    cat > "$metadata_file" << EOF
BotBot Backup Information
========================
Backup Date: $(date)
Backup Version: 1.0
Hostname: $(hostname)
User: $(whoami)
Backup Directory: $CURRENT_BACKUP_DIR

System Information:
- OS: $(uname -s)
- Kernel: $(uname -r)
- Architecture: $(uname -m)

Application Information:
- Node.js Version: $(node --version 2>/dev/null || echo "Not available")
- NPM Version: $(npm --version 2>/dev/null || echo "Not available")
- Docker Version: $(docker --version 2>/dev/null || echo "Not available")

Backup Contents:
- Database: $(test -f "$CURRENT_BACKUP_DIR/data/botbot.db" && echo "Yes" || echo "No")
- Configuration: $(test -d "$CURRENT_BACKUP_DIR/config" && echo "Yes" || echo "No")
- Logs: $(test -d "$CURRENT_BACKUP_DIR/logs" && echo "Yes" || echo "No")

EOF
    
    # Add file checksums
    echo "" >> "$metadata_file"
    echo "File Checksums:" >> "$metadata_file"
    echo "===============" >> "$metadata_file"
    
    find "$CURRENT_BACKUP_DIR" -type f -not -path "*/metadata/*" -exec sha256sum {} \; >> "$metadata_file" 2>/dev/null || \
    find "$CURRENT_BACKUP_DIR" -type f -not -path "*/metadata/*" -exec shasum -a 256 {} \; >> "$metadata_file" 2>/dev/null || \
    echo "Checksums not available" >> "$metadata_file"
    
    success "Backup metadata created"
}

# Compress backup
compress_backup() {
    if [[ "$COMPRESS_BACKUPS" != "true" ]]; then
        log "Compression disabled, skipping..."
        return
    fi
    
    log "Compressing backup..."
    
    local backup_name=$(basename "$CURRENT_BACKUP_DIR")
    local compressed_file="$BACKUP_DIR/${backup_name}.tar.gz"
    
    cd "$BACKUP_DIR"
    tar -czf "$compressed_file" "$backup_name"
    
    # Verify compression
    if [[ -f "$compressed_file" ]]; then
        local original_size=$(du -sb "$backup_name" | cut -f1)
        local compressed_size=$(stat -f%z "$compressed_file" 2>/dev/null || stat -c%s "$compressed_file")
        local compression_ratio=$(echo "scale=2; $compressed_size * 100 / $original_size" | bc -l 2>/dev/null || echo "unknown")
        
        log "Compression completed: $original_size bytes -> $compressed_size bytes ($compression_ratio%)"
        
        # Remove uncompressed directory
        rm -rf "$backup_name"
        CURRENT_BACKUP_FILE="$compressed_file"
        
        success "Backup compressed successfully"
    else
        error "Compression failed"
    fi
}

# Encrypt backup
encrypt_backup() {
    if [[ "$ENCRYPT_BACKUPS" != "true" ]]; then
        log "Encryption disabled, skipping..."
        return
    fi
    
    if [[ -z "$BACKUP_ENCRYPTION_KEY" ]]; then
        warning "BACKUP_ENCRYPTION_KEY not set, skipping encryption"
        return
    fi
    
    log "Encrypting backup..."
    
    local backup_file="${CURRENT_BACKUP_FILE:-$CURRENT_BACKUP_DIR}"
    local encrypted_file="${backup_file}.enc"
    
    # Use OpenSSL for encryption
    openssl enc -aes-256-cbc -salt -in "$backup_file" -out "$encrypted_file" -k "$BACKUP_ENCRYPTION_KEY"
    
    if [[ -f "$encrypted_file" ]]; then
        rm "$backup_file"
        CURRENT_BACKUP_FILE="$encrypted_file"
        success "Backup encrypted successfully"
    else
        error "Encryption failed"
    fi
}

# Upload to S3
upload_to_s3() {
    if [[ "$UPLOAD_TO_S3" != "true" ]]; then
        log "S3 upload disabled, skipping..."
        return
    fi
    
    if [[ -z "$S3_BUCKET" ]]; then
        warning "S3_BUCKET not set, skipping S3 upload"
        return
    fi
    
    log "Uploading backup to S3..."
    
    local backup_file="${CURRENT_BACKUP_FILE:-$CURRENT_BACKUP_DIR}"
    local backup_name=$(basename "$backup_file")
    local s3_key="$S3_PREFIX/$backup_name"
    
    # Upload using AWS CLI
    if command -v aws &> /dev/null; then
        aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key"
        success "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
    else
        warning "AWS CLI not found, skipping S3 upload"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    
    # Clean local backups
    find "$BACKUP_DIR" -name "botbot_backup_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean S3 backups if configured
    if [[ "$UPLOAD_TO_S3" == "true" && -n "$S3_BUCKET" ]] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d 2>/dev/null)
        
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}' | tr -d '-')
            local file_name=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$file_name"
                log "Deleted old S3 backup: $file_name"
            fi
        done
    fi
    
    success "Old backups cleaned up"
}

# Send backup notification
send_notification() {
    log "Sending backup notification..."
    
    local backup_file="${CURRENT_BACKUP_FILE:-$CURRENT_BACKUP_DIR}"
    local backup_size="unknown"
    
    if [[ -f "$backup_file" ]]; then
        backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "unknown")
    elif [[ -d "$backup_file" ]]; then
        backup_size=$(du -sb "$backup_file" | cut -f1)
    fi
    
    local message="BotBot backup completed successfully
Backup file: $(basename "$backup_file")
Size: $backup_size bytes
Date: $(date)
Retention: $RETENTION_DAYS days"
    
    # This could send notifications to various services
    # For now, just log the completion
    success "Backup notification: $message"
}

# Main backup function
main() {
    log "Starting BotBot backup process..."
    
    # Ensure backup directory exists
    mkdir -p "$BACKUP_DIR"
    
    # Create backup
    create_backup_dir
    backup_database
    backup_config
    backup_logs
    create_metadata
    compress_backup
    encrypt_backup
    upload_to_s3
    cleanup_old_backups
    send_notification
    
    success "Backup process completed successfully!"
    log "Backup location: ${CURRENT_BACKUP_FILE:-$CURRENT_BACKUP_DIR}"
}

# Run main function
main "$@"