#!/bin/bash

echo "Stopping any running Jekyll containers..."
sudo docker compose down

echo "Pulling latest Docker image (if needed)..."
sudo docker compose pull

echo "Building and starting the Jekyll site with Docker..."
sudo docker compose up --build -d

echo ""
echo "Your site should be available at: http://localhost:8080"
echo "To stop the site, run: sudo docker compose down"