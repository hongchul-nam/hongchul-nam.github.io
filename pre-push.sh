#!/bin/bash
# Run Prettier before pushing

echo "Running Prettier formatting..."
npx prettier --write .

if [ $? -ne 0 ]; then
  echo "Prettier failed. Please fix formatting before pushing."
  exit 1
fi

echo "Prettier formatting complete. Proceeding with push." 