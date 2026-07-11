#!/bin/bash
echo "==================================================="
echo "  Starting TouchMe Portal (NexusHub) Server..."
echo "  Opening http://localhost:3000 in your browser..."
echo "==================================================="
echo

# Open localhost in the default browser
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:3000 &
elif command -v open > /dev/null; then
  open http://localhost:3000 &
fi

# Run the node server
npm start
