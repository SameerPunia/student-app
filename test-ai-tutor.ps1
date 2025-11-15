
# PowerShell script to test AI Tutor Edge Function
# This script verifies that the AI Tutor is working correctly

Write-Host ""
Write-Host "🧪 AI Tutor Test Script" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

$functionUrl = "https://telrerkizvtzbxjdlyoj.supabase.co/functions/v1/ai-tutor"

# Test 1: Simple question
Write-Host "📋 Test 1: Sending a simple question..." -ForegroundColor Yellow
Write-Host ""

$testQuestion = @{
    type = "question"
    question = "What is 2+2? Give a brief answer."
} | ConvertTo-Json

try {
    Write-Host "   Sending request..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri $functionUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $testQuestion `
        -TimeoutSec 30

    if ($response.response) {
        Write-Host "✅ Test 1 PASSED" -ForegroundColor Green
        Write-Host ""
        Write-Host "   AI Response:" -ForegroundColor Cyan
        Write-Host "   $($response.response.Substring(0, [Math]::Min(200, $response.response.Length)))..." -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Test 1 FAILED - No response received" -ForegroundColor Red
        Write-Host "   Response: $($response | ConvertTo-Json)" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host "❌ Test 1 FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Message -like "*404*" -or $_.Exception.Message -like "*not found*") {
        Write-Host "🔧 Diagnosis: Edge function not found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Solution:" -ForegroundColor Cyan
        Write-Host "   1. Deploy the function: .\deploy-ai-tutor.ps1" -ForegroundColor White
        Write-Host "   2. Or manually: supabase functions deploy ai-tutor --no-verify-jwt" -ForegroundColor White
        Write-Host ""
    } elseif ($_.Exception.Message -like "*500*") {
        Write-Host "🔧 Diagnosis: Server error (likely missing API keys)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Solution:" -ForegroundColor Cyan
        Write-Host "   1. Set GEMINI_API_KEY: supabase secrets set GEMINI_API_KEY=your_key" -ForegroundColor White
        Write-Host "   2. Set SUPABASE_SERVICE_ROLE_KEY: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key" -ForegroundColor White
        Write-Host "   3. Redeploy: supabase functions deploy ai-tutor --no-verify-jwt" -ForegroundColor White
        Write-Host ""
    } elseif ($_.Exception.Message -like "*timeout*") {
        Write-Host "🔧 Diagnosis: Request timeout" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Solution:" -ForegroundColor Cyan
        Write-Host "   1. Check your internet connection" -ForegroundColor White
        Write-Host "   2. Try again in a few moments" -ForegroundColor White
        Write-Host "   3. Check Supabase status: https://status.supabase.com/" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "🔧 Diagnosis: Unknown error" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Solution:" -ForegroundColor Cyan
        Write-Host "   1. Check function logs: supabase functions logs ai-tutor" -ForegroundColor White
        Write-Host "   2. Verify deployment: supabase functions list" -ForegroundColor White
        Write-Host "   3. Redeploy: .\deploy-ai-tutor.ps1" -ForegroundColor White
        Write-Host ""
    }
    
    exit 1
}

# Test 2: Check response time
Write-Host "📋 Test 2: Checking response time..." -ForegroundColor Yellow
Write-Host ""

$testQuestion2 = @{
    type = "question"
    question = "What is AI?"
} | ConvertTo-Json

try {
    Write-Host "   Measuring response time..." -ForegroundColor Gray
    $startTime = Get-Date
    
    $response2 = Invoke-RestMethod -Uri $functionUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $testQuestion2 `
        -TimeoutSec 30
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    if ($duration -lt 10) {
        Write-Host "✅ Test 2 PASSED - Response time: $([Math]::Round($duration, 2))s" -ForegroundColor Green
    } elseif ($duration -lt 20) {
        Write-Host "⚠️  Test 2 WARNING - Response time: $([Math]::Round($duration, 2))s (slower than expected)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Test 2 FAILED - Response time: $([Math]::Round($duration, 2))s (too slow)" -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "❌ Test 2 FAILED - Could not measure response time" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Error handling
Write-Host "📋 Test 3: Testing error handling..." -ForegroundColor Yellow
Write-Host ""

$testInvalid = @{
    type = "invalid_type"
    question = "This should fail"
} | ConvertTo-Json

try {
    Write-Host "   Sending invalid request..." -ForegroundColor Gray
    $response3 = Invoke-RestMethod -Uri $functionUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $testInvalid `
        -TimeoutSec 30
    
    Write-Host "❌ Test 3 FAILED - Should have returned an error" -ForegroundColor Red
    Write-Host ""
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Test 3 PASSED - Error handling works correctly" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "⚠️  Test 3 WARNING - Unexpected error code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ If all tests passed, your AI Tutor is ready to use!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Open your Student Buddy app" -ForegroundColor White
Write-Host "   2. Navigate to AI Tutor" -ForegroundColor White
Write-Host "   3. Start asking questions!" -ForegroundColor White
Write-Host ""
Write-Host "📚 For more help, see: AI_TUTOR_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
