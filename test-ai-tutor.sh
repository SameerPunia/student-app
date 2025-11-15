
#!/bin/bash

echo "🧪 Testing AI Tutor Edge Function"
echo "=================================="
echo ""

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed (optional, for pretty JSON output)"
    echo "   Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    echo ""
fi

# Get project details
echo "📋 Please provide your Supabase project details:"
echo ""
read -p "Project Reference (from dashboard URL): " PROJECT_REF
read -p "Anon Key (from Project Settings → API): " ANON_KEY

echo ""
echo "🚀 Testing AI Tutor with a simple question..."
echo ""

# Test question
RESPONSE=$(curl -s -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/ai-tutor" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is 2+2?",
    "type": "question"
  }')

echo "📥 Response received:"
echo ""

# Pretty print if jq is available, otherwise just print
if command -v jq &> /dev/null; then
    echo "$RESPONSE" | jq '.'
else
    echo "$RESPONSE"
fi

echo ""

# Check for errors
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Test failed - see error above"
    echo ""
    echo "Common issues:"
    echo "  • Function not deployed: run 'supabase functions deploy ai-tutor'"
    echo "  • Wrong project ref or anon key"
    echo "  • Not logged in: run 'supabase login'"
    exit 1
else
    echo "✅ Test successful!"
    echo ""
    echo "🎉 Your AI Tutor is working correctly!"
    echo ""
    echo "Next steps:"
    echo "  1. Open your app"
    echo "  2. Navigate to AI Tutor"
    echo "  3. Start asking questions!"
fi
