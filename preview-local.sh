#!/bin/bash
echo "Stopping any running Jekyll containers..."
sudo docker compose down

echo "Building and starting the Jekyll site with Docker..."
sudo docker compose up --build

echo ""
echo "Your site should be available at: http://localhost:8080"
echo "To stop the site, press Ctrl+C and then run: sudo docker compose down"