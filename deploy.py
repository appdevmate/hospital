"""
Angular App Deployment Script for AWS S3 + CloudFront
======================================================
This script automates the deployment of an Angular app to AWS S3 with CloudFront CDN.

Prerequisites:
    - Python 3.8+
    - AWS CLI installed and configured (run 'aws configure' first)
    - Angular CLI installed (npm install -g @angular/cli)
    - You must be in your Angular project root directory when running this script

Usage:
    python deploy.py

Configuration:
    Edit the variables in the CONFIGURATION section below to match your setup.
"""

import subprocess
import sys
import os
import time
from pathlib import Path

# ============================================================
# CONFIGURATION — Edit these values to match your setup
# ============================================================

BUCKET_NAME = "tiryaq-bucket"
DISTRIBUTION_ID = "E3J3D3EMIOIACT"
DIST_PATH = "dist/verona-ng/browser"  # Angular build output path
REGION = "us-east-1"

# ============================================================
# DO NOT EDIT BELOW THIS LINE
# ============================================================

# Colors for terminal output (Windows compatible)
class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    END = "\033[0m"


def print_step(step_num, total, message):
    """Print a formatted step header."""
    print(f"\n{Colors.CYAN}{Colors.BOLD}[Step {step_num}/{total}]{Colors.END} {Colors.BOLD}{message}{Colors.END}")
    print("=" * 60)


def print_success(message):
    """Print a success message."""
    print(f"{Colors.GREEN}  ✓ {message}{Colors.END}")


def print_error(message):
    """Print an error message."""
    print(f"{Colors.RED}  ✗ {message}{Colors.END}")


def print_info(message):
    """Print an info message."""
    print(f"{Colors.YELLOW}  ℹ {message}{Colors.END}")


def run_command(command, description, show_output=True):
    """
    Run a shell command and handle errors.
    Returns (success: bool, output: str)
    """
    print(f"\n  Running: {Colors.CYAN}{command}{Colors.END}")

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        if result.returncode != 0:
            print_error(f"{description} failed!")
            if result.stderr:
                print(f"  Error: {result.stderr.strip()}")
            return False, result.stderr

        if show_output and result.stdout.strip():
            # Limit output to first 20 lines to avoid flooding
            lines = result.stdout.strip().split("\n")
            for line in lines[:20]:
                print(f"  {line}")
            if len(lines) > 20:
                print(f"  ... and {len(lines) - 20} more lines")

        print_success(description)
        return True, result.stdout

    except Exception as e:
        print_error(f"{description} failed with exception: {e}")
        return False, str(e)


def check_prerequisites():
    """Verify all required tools are installed and configured."""
    print_step(0, 5, "Checking prerequisites")

    # Check AWS CLI
    success, output = run_command("aws --version", "AWS CLI check", show_output=False)
    if not success:
        print_error("AWS CLI is not installed. Download from: https://awscli.amazonaws.com/AWSCLIV2.msi")
        return False
    print_success(f"AWS CLI installed: {output.strip()}")

    # Check AWS credentials
    success, output = run_command("aws sts get-caller-identity", "AWS credentials check", show_output=False)
    if not success:
        print_error("AWS credentials not configured. Run 'aws configure' first.")
        return False
    print_success("AWS credentials configured")

    # Check Angular CLI
    success, output = run_command("ng version", "Angular CLI check", show_output=False)
    if not success:
        print_error("Angular CLI is not installed. Run: npm install -g @angular/cli")
        return False
    print_success("Angular CLI installed")

    # Check that we're in an Angular project
    if not os.path.exists("angular.json"):
        print_error("angular.json not found. Are you in your Angular project root directory?")
        return False
    print_success("Angular project detected (angular.json found)")

    return True


def build_angular():
    """Build the Angular app for production."""
    print_step(1, 5, "Building Angular application")

    success, _ = run_command("ng build", "Angular production build")
    if not success:
        return False

    # Verify build output exists
    build_path = Path(DIST_PATH)
    if not build_path.exists():
        print_error(f"Build output not found at: {DIST_PATH}")
        print_info("Check your angular.json for the correct output path.")
        print_info("Common paths: dist/<project-name>/browser/")
        return False

    index_path = build_path / "index.html"
    if not index_path.exists():
        print_error(f"index.html not found in {DIST_PATH}")
        return False

    # Count files
    file_count = sum(1 for _ in build_path.rglob("*") if _.is_file())
    total_size = sum(f.stat().st_size for f in build_path.rglob("*") if f.is_file())
    total_size_mb = total_size / (1024 * 1024)

    print_success(f"Build output: {file_count} files, {total_size_mb:.2f} MB at {DIST_PATH}")

    return True


def upload_assets():
    """Upload hashed assets with long cache headers."""
    print_step(2, 5, "Uploading hashed assets to S3 (1-year cache)")

    command = (
        f'aws s3 sync {DIST_PATH}/ s3://{BUCKET_NAME} '
        f'--delete '
        f'--cache-control "public,max-age=31536000,immutable" '
        f'--exclude "index.html" '
        f'--exclude "*.json"'
    )

    success, _ = run_command(command, "Upload hashed assets (JS, CSS, images, fonts)")
    return success


def upload_index():
    """Upload index.html with no-cache headers."""
    print_step(3, 5, "Uploading index.html to S3 (no cache)")

    command = (
        f'aws s3 cp {DIST_PATH}/index.html s3://{BUCKET_NAME}/index.html '
        f'--cache-control "no-cache,no-store,must-revalidate" '
        f'--content-type "text/html"'
    )

    success, _ = run_command(command, "Upload index.html")
    if not success:
        return False

    # Upload JSON files with no-cache
    command_json = (
        f'aws s3 sync {DIST_PATH}/ s3://{BUCKET_NAME} '
        f'--cache-control "no-cache,no-store,must-revalidate" '
        f'--exclude "*" '
        f'--include "*.json"'
    )

    success, _ = run_command(command_json, "Upload JSON files")
    return success


def invalidate_cache():
    """Invalidate CloudFront cache."""
    print_step(4, 5, "Invalidating CloudFront cache")

    command = (
        f'aws cloudfront create-invalidation '
        f'--distribution-id {DISTRIBUTION_ID} '
        f'--paths "/*"'
    )

    success, output = run_command(command, "CloudFront cache invalidation")
    if not success:
        return False

    print_info("Cache invalidation takes 1-2 minutes to complete globally.")
    return True


def verify_deployment():
    """Verify the deployment by checking distribution status."""
    print_step(5, 5, "Verifying deployment")

    # Check distribution status
    command = (
        f'aws cloudfront get-distribution '
        f'--id {DISTRIBUTION_ID} '
        f'--query "Distribution.{{Status:Status,Domain:DomainName,Enabled:DistributionConfig.Enabled}}" '
        f'--output json'
    )

    success, output = run_command(command, "Distribution status check")
    if not success:
        return False

    # Verify index.html exists in S3
    command_s3 = f'aws s3 ls s3://{BUCKET_NAME}/index.html'
    success, _ = run_command(command_s3, "Verify index.html in S3", show_output=False)
    if success:
        print_success("index.html confirmed in S3 bucket root")
    else:
        print_error("index.html NOT found in S3 bucket root!")
        return False

    return True


def main():
    """Main deployment pipeline."""
    print(f"""
{Colors.BOLD}╔══════════════════════════════════════════════════════════╗
║        Angular → S3 + CloudFront Deployment             ║
╠══════════════════════════════════════════════════════════╣
║  Bucket:       {BUCKET_NAME:<40} ║
║  Distribution: {DISTRIBUTION_ID:<40} ║
║  Build Path:   {DIST_PATH:<40} ║
║  Region:       {REGION:<40} ║
╚══════════════════════════════════════════════════════════╝{Colors.END}
""")

    start_time = time.time()

    # Step 0: Prerequisites
    if not check_prerequisites():
        print_error("Prerequisites check failed. Fix the issues above and try again.")
        sys.exit(1)

    # Step 1: Build
    if not build_angular():
        print_error("Build failed. Fix Angular errors and try again.")
        sys.exit(1)

    # Step 2: Upload assets
    if not upload_assets():
        print_error("Asset upload failed. Check your AWS credentials and bucket name.")
        sys.exit(1)

    # Step 3: Upload index.html + JSON
    if not upload_index():
        print_error("Index upload failed. Check your AWS credentials and bucket name.")
        sys.exit(1)

    # Step 4: Invalidate cache
    if not invalidate_cache():
        print_error("Cache invalidation failed. Check your distribution ID.")
        sys.exit(1)

    # Step 5: Verify
    verify_deployment()

    # Done
    elapsed = time.time() - start_time
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)

    print(f"""
{Colors.GREEN}{Colors.BOLD}╔══════════════════════════════════════════════════════════╗
║                 DEPLOYMENT COMPLETE! 🎉                  ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Your site is live at:                                   ║
║  https://d342qui64t7xt0.cloudfront.net                   ║
║                                                          ║
║  Time elapsed: {minutes}m {seconds}s{' ' * (38 - len(f'{minutes}m {seconds}s'))} ║
║                                                          ║
║  Note: CloudFront cache invalidation takes 1-2 minutes.  ║
║  If you see old content, wait a moment and refresh.      ║
╚══════════════════════════════════════════════════════════╝{Colors.END}
""")


if __name__ == "__main__":
    main()
