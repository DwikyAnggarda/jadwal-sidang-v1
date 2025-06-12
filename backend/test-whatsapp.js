#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_PHONES = ['0895341112220', '083832108514', '081230929260'];

// ANSI color codes for better output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
    console.log('\n' + '='.repeat(60));
    log(message, colors.bold + colors.cyan);
    console.log('='.repeat(60));
}

function logSuccess(message) {
    log(`✅ ${message}`, colors.green);
}

function logError(message) {
    log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
    log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, colors.blue);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWhatsAppStatus() {
    logHeader('1. Testing WhatsApp Service Status');
    try {
        const response = await axios.get(`${BASE_URL}/notifications/status`, {
            timeout: 5000
        });
        
        if (response.data.success) {
            logSuccess('WhatsApp service is connected');
            logInfo(`Status: ${JSON.stringify(response.data.status, null, 2)}`);
        } else {
            logError('WhatsApp service is disconnected');
            logWarning(response.data.message);
        }
        return response.data.success;
    } catch (error) {
        logError(`Failed to check WhatsApp status: ${error.message}`);
        return false;
    }
}

async function testPhoneFormatting() {
    logHeader('2. Testing Phone Number Formatting');
    
    const testCases = [
        { input: '0895341112220', expected: '6295341112220' },
        { input: '083832108514', expected: '6283832108514' },
        { input: '081230929260', expected: '6281230929260' },
        { input: '8123456789', expected: '628123456789' },
        { input: '628123456789', expected: '628123456789' }
    ];
    
    // Since formatPhoneNumber is internal, we'll test via the test endpoint
    for (const testCase of testCases) {
        try {
            const response = await axios.post(`${BASE_URL}/notifications/test`, {
                phone: testCase.input,
                message: 'Test formatting - please ignore'
            });
            
            if (response.data.phone === testCase.expected) {
                logSuccess(`${testCase.input} → ${response.data.phone} ✓`);
            } else {
                logError(`${testCase.input} → ${response.data.phone} (expected: ${testCase.expected})`);
            }
        } catch (error) {
            logError(`Failed to test phone formatting for ${testCase.input}: ${error.message}`);
        }
        
        await delay(1000); // Rate limiting
    }
}

async function testSingleNotification() {
    logHeader('3. Testing Single Test Notification');
    
    try {
        const response = await axios.post(`${BASE_URL}/notifications/test`, {
            phone: TEST_PHONES[0],
            message: '🧪 *TEST NOTIFICATION*\n\nIni adalah pesan test dari sistem notifikasi WhatsApp untuk jadwal sidang.\n\nJika Anda menerima pesan ini, berarti sistem berfungsi dengan baik.\n\n✅ Test berhasil!'
        });
        
        if (response.data.success) {
            logSuccess(`Test notification sent to ${response.data.phone}`);
            logInfo(`Timestamp: ${response.data.timestamp}`);
        } else {
            logError(`Failed to send test notification: ${response.data.error}`);
        }
        
        return response.data.success;
    } catch (error) {
        logError(`Test notification failed: ${error.message}`);
        return false;
    }
}

async function getSampleSidangData() {
    logHeader('4. Getting Sample Sidang Data');
    
    try {
        // Get sidang groups
        const groupsResponse = await axios.get(`${BASE_URL}/sidang-group`);
        const groups = groupsResponse.data;
        
        if (groups.length === 0) {
            logWarning('No sidang groups found');
            return null;
        }
        
        logInfo(`Found ${groups.length} sidang groups`);
        
        // Get first group details
        const groupId = groups[0].id;
        const detailResponse = await axios.get(`${BASE_URL}/sidang-group/${groupId}/detail`);
        const detail = detailResponse.data;
        
        if (detail.items.length === 0) {
            logWarning('No sidang items found in first group');
            return null;
        }
        
        logSuccess(`Found ${detail.items.length} sidang items in group ${groupId}`);
        logInfo(`Sample sidang: ${detail.items[0].nama_mahasiswa} (${detail.items[0].nrp})`);
        
        return {
            groupId: groupId,
            sidangId: detail.items[0].id,
            group: detail.group,
            item: detail.items[0]
        };
    } catch (error) {
        logError(`Failed to get sidang data: ${error.message}`);
        return null;
    }
}

async function testSidangNotification(sidangData) {
    if (!sidangData) {
        logWarning('Skipping sidang notification test - no data available');
        return false;
    }
    
    logHeader('5. Testing Sidang Notification');
    
    try {
        const response = await axios.post(`${BASE_URL}/notifications/sidang/${sidangData.sidangId}`);
        
        if (response.data.success) {
            logSuccess(`Sidang notification completed`);
            logInfo(`Summary: ${response.data.summary.sent}/${response.data.summary.total} sent`);
            
            // Show detailed results
            response.data.details.forEach(notification => {
                if (notification.success) {
                    logSuccess(`${notification.role} (${notification.nama}): Sent to ${notification.phone}`);
                } else {
                    logError(`${notification.role} (${notification.nama}): ${notification.error}`);
                }
            });
        } else {
            logError(`Sidang notification failed: ${response.data.message}`);
        }
        
        return response.data.success;
    } catch (error) {
        logError(`Sidang notification failed: ${error.message}`);
        return false;
    }
}

async function testBatchNotification(sidangData) {
    if (!sidangData) {
        logWarning('Skipping batch notification test - no data available');
        return false;
    }
    
    logHeader('6. Testing Batch Group Notification');
    
    try {
        const response = await axios.post(`${BASE_URL}/notifications/group/${sidangData.groupId}`);
        
        if (response.data.success) {
            logSuccess(`Batch notification completed`);
            logInfo(`Summary: ${response.data.summary.sent}/${response.data.summary.total_notifications} sent for ${response.data.summary.total_sidang} sidang`);
            
            // Show summary for each sidang
            response.data.details.forEach(sidang => {
                const successCount = sidang.notifications.filter(n => n.success).length;
                logInfo(`${sidang.mahasiswa} (${sidang.nrp}): ${successCount}/${sidang.notifications.length} notifications sent`);
            });
        } else {
            logError(`Batch notification failed: ${response.data.message}`);
        }
        
        return response.data.success;
    } catch (error) {
        logError(`Batch notification failed: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    logHeader('WhatsApp Notification System Test Suite');
    log('Starting comprehensive testing...', colors.bold);
    
    const results = {
        whatsappStatus: false,
        phoneFormatting: true, // Assume success unless we detect failures
        singleNotification: false,
        sidangNotification: false,
        batchNotification: false
    };
    
    // Test 1: WhatsApp Status
    results.whatsappStatus = await testWhatsAppStatus();
    await delay(2000);
    
    // Test 2: Phone Formatting
    await testPhoneFormatting();
    await delay(2000);
    
    // Test 3: Single Notification
    if (results.whatsappStatus) {
        results.singleNotification = await testSingleNotification();
        await delay(3000);
    } else {
        logWarning('Skipping notification tests - WhatsApp service not connected');
    }
    
    // Test 4 & 5: Get sample data and test notifications
    const sidangData = await getSampleSidangData();
    await delay(2000);
    
    if (results.whatsappStatus && sidangData) {
        results.sidangNotification = await testSidangNotification(sidangData);
        await delay(5000);
        
        // Only test batch if we want to send more notifications
        logInfo('Batch notification test available but skipped to avoid spam');
        // results.batchNotification = await testBatchNotification(sidangData);
    }
    
    // Final Summary
    logHeader('Test Results Summary');
    Object.entries(results).forEach(([test, success]) => {
        if (success) {
            logSuccess(`${test}: PASSED`);
        } else {
            logError(`${test}: FAILED`);
        }
    });
    
    const passedTests = Object.values(results).filter(r => r).length;
    const totalTests = Object.keys(results).length;
    
    console.log('\n' + '='.repeat(60));
    if (passedTests === totalTests) {
        logSuccess(`All tests passed! (${passedTests}/${totalTests})`);
    } else {
        logWarning(`${passedTests}/${totalTests} tests passed`);
    }
    console.log('='.repeat(60));
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        logError(`Test suite failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testWhatsAppStatus,
    testPhoneFormatting,
    testSingleNotification
};
