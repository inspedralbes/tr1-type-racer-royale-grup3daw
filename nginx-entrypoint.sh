#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# DEBUG: Print the environment variables to the log
echo "--- NGINX ENTRYPOINT DEBUG ---"
echo "ADMINER_USER is: [${ADMINER_USER}]"
echo "ADMINER_PASSWORD is: [${ADMINER_PASSWORD}]"
echo "------------------------------"

# Create the .htpasswd file using environment variables
# The -b flag is for batch mode, -c to create a new file
htpasswd -bc /etc/nginx/.htpasswd "$ADMINER_USER" "$ADMINER_PASSWORD"

# Execute the CMD from the Dockerfile (i.e., start nginx)
exec "$@"
