#!/bin/bash
# Script to add dynamic = 'force-dynamic' to all route.ts files

echo "🔧 Adding dynamic export to all API route files..."

# Create a temporary file
TEMP_FILE=$(mktemp)

# Find all route.ts files in src/api and src/app/api
find ./src -name "route.ts" -type f -not -path "*/node_modules/*" | while read file; do
  echo "Processing $file"
  
  # Check if file already has dynamic export
  if grep -q "export const dynamic" "$file"; then
    echo "  Already has dynamic export, skipping"
    continue
  fi
  
  # Find the first export line
  FIRST_EXPORT=$(grep -n "export " "$file" | head -1 | cut -d: -f1)
  
  if [ -z "$FIRST_EXPORT" ]; then
    echo "  No export found, skipping"
    continue
  fi
  
  # Write the file with the dynamic export added
  head -n $((FIRST_EXPORT-1)) "$file" > "$TEMP_FILE"
  echo "// Mark this route as dynamic to handle cookies/auth" >> "$TEMP_FILE"
  echo "export const dynamic = 'force-dynamic';" >> "$TEMP_FILE"
  echo "" >> "$TEMP_FILE"
  tail -n +$((FIRST_EXPORT)) "$file" >> "$TEMP_FILE"
  
  # Replace the original file
  cp "$TEMP_FILE" "$file"
  echo "  ✅ Added dynamic export"
done

# Clean up
rm "$TEMP_FILE"

echo "✅ Done processing route files"