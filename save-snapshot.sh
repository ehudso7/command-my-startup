#!/bin/bash

# Get args
AREA="$1"
DESCRIPTION="$2"
DATE=$(date +"%Y-%m-%d")
TAG="${AREA}-snapshot-${DATE}"
SNAPSHOT_DIR="docs/snapshots"

# Check required files
SNAPSHOT_FILE="PROJECT_SNAPSHOT.md"
PROMPT_FILE="RESTORATION_PROMPT.md"

if [ ! -f "$SNAPSHOT_FILE" ] || [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ Snapshot or restoration prompt file not found in current directory!"
  exit 1
fi

# Create snapshot dir if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

# Move files with timestamps
mv "$SNAPSHOT_FILE" "$SNAPSHOT_DIR/${SNAPSHOT_FILE%.md}-$DATE.md"
mv "$PROMPT_FILE" "$SNAPSHOT_DIR/${PROMPT_FILE%.md}-$DATE.md"

# Append to index
INDEX_FILE="$SNAPSHOT_DIR/PROJECT_SNAPSHOTS_INDEX.md"
echo "| $DATE | $AREA | ${SNAPSHOT_FILE%.md}-$DATE.md | $TAG |" >> "$INDEX_FILE"
echo "| $DATE | $AREA | ${PROMPT_FILE%.md}-$DATE.md | ${TAG/bugfix/restore} |" >> "$INDEX_FILE"

# Git commit & tag
git add "$SNAPSHOT_DIR"
git commit -m "🧠 Snapshot: $AREA – $DESCRIPTION ($DATE)"
git tag "$TAG"
git push
git push origin "$TAG"

echo "✅ Snapshot saved and indexed successfully!"

