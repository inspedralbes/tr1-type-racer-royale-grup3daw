#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# Create the .htpasswd file using environment variables
# The -b flag is for batch mode, -c to create a new file
htpasswd -bc /etc/nginx/.htpasswd "$ADMINER_USER" "$ADMINER_PASSWORD"

# Execute the CMD from the Dockerfile (i.e., start nginx)
exec "$@"
