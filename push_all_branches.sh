#!/bin/bash

# List of branches to push to
branches=("main" "production" "staging" "ci-fix-backend" "backup-branch" "local-terminal-changes")

# Current working branch
current_branch=$(git branch --show-current)

# Commit any changes
git add .
if git diff-index --quiet HEAD --; then
    echo "No changes to commit. Skipping commit."
else
    git commit -m "Committing changes from $current_branch"
fi

# Push changes to the current branch
git push origin $current_branch

# Push changes to all other branches
for branch in "${branches[@]}"; do
    if [ "$branch" != "$current_branch" ]; then
        echo "Switching to $branch"
        git checkout $branch
        git merge $current_branch --no-edit
        git push origin $branch
    fi
done

# Switch back to the original branch
git checkout $current_branch

echo "All changes pushed to the branches successfully!"

