#!/bin/bash

# Install Node.js dependencies
npm install

# Ensure auth_info.json exists
if [ ! -f auth_info.json ]; then
  touch auth_info.json
fi

# Ensure creds.json exists
if [ ! -f creds.json ]; then
  echo '{}' > creds.json
fi

# Run the application
npm start
