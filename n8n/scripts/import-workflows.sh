#!/bin/bash

# N8N Workflow Import Script
# Provides instructions and utilities for importing Hyperformant workflows to N8N

echo "🚀 Hyperformant N8N Workflow Import"
echo "====================================="
echo ""

N8N_URL="http://localhost:5678"

# Check if N8N is running
echo "🔍 Checking N8N status..."
if curl -s "${N8N_URL}/healthz" > /dev/null 2>&1; then
    echo "✅ N8N is running at ${N8N_URL}"
else
    echo "❌ N8N is not accessible at ${N8N_URL}"
    echo "   Please start N8N first: n8n start"
    exit 1
fi

echo ""
echo "📋 Manual Import Instructions:"
echo "==============================="
echo ""
echo "1. Open N8N Editor: ${N8N_URL}"
echo "2. Click 'Add workflow' or go to Workflows tab"
echo "3. Click the 'Import from file' button (📁 icon)"
echo "4. Select workflow JSON files from: $(pwd)/../workflows/"
echo ""

# List available workflow files
echo "📁 Available workflow files:"
echo "----------------------------"

WORKFLOWS_DIR="$(dirname "$0")/../workflows"
if [ -d "$WORKFLOWS_DIR" ]; then
    for file in "$WORKFLOWS_DIR"/*.json; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            echo "   📄 $filename"
            
            # Extract workflow name from JSON
            if command -v jq > /dev/null 2>&1; then
                workflow_name=$(jq -r '.name // "Unknown"' "$file" 2>/dev/null)
                echo "      Name: $workflow_name"
            fi
            echo ""
        fi
    done
else
    echo "   ❌ Workflows directory not found: $WORKFLOWS_DIR"
fi

echo "⚡ After importing:"
echo "=================="
echo "1. Activate each workflow (toggle switch)"
echo "2. Configure any credentials needed:"
echo "   - HTTP Basic Auth for API endpoints"
echo "   - PostgreSQL connection for database operations"
echo "3. Test webhook endpoints manually"
echo ""

echo "🧪 Testing webhook endpoints:"
echo "============================="

# Test Apollo sync webhook
echo "🔗 Apollo Sync Webhook:"
echo "   URL: ${N8N_URL}/webhook/apollo-sync"
echo "   Test command:"
echo "   curl -X POST ${N8N_URL}/webhook/apollo-sync \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"test\": true, \"trigger\": \"manual\"}'"
echo ""

echo "📊 Monitoring:"
echo "============="
echo "• View executions: ${N8N_URL}/executions"
echo "• Check workflow logs for any errors"
echo "• Monitor PostgreSQL connections"
echo ""

echo "✨ Next Steps:"
echo "============="
echo "1. Import workflows using N8N UI"
echo "2. Configure credentials and connections"
echo "3. Test webhook endpoints"
echo "4. Activate workflows for scheduled execution"
echo ""

# Optional: Open N8N in browser if on desktop environment
if command -v xdg-open > /dev/null 2>&1; then
    read -p "🌐 Open N8N Editor in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "$N8N_URL"
    fi
fi