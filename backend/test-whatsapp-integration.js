const axios = require('axios');

const baseURL = 'http://localhost:5000';
const testPhones = ['0895341112220', '083832108514', '081230929260'];

class WhatsAppTester {
    constructor() {
        this.results = [];
    }

    async log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, data };
        this.results.push(logEntry);
        console.log(`[${timestamp}] ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testEndpoint(method, endpoint, data = null) {
        try {
            const config = {
                method,
                url: `${baseURL}${endpoint}`,
                timeout: 10000,
            };
            
            if (data) {
                config.data = data;
                config.headers = { 'Content-Type': 'application/json' };
            }

            const response = await axios(config);
            await this.log(`✅ ${method} ${endpoint} - Success`, {
                status: response.status,
                data: response.data
            });
            return { success: true, data: response.data };
        } catch (error) {
            await this.log(`❌ ${method} ${endpoint} - Failed`, {
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            });
            return { success: false, error: error.message };
        }
    }

    async testWhatsAppStatus() {
        await this.log('🔍 Testing WhatsApp Status...');
        const statusResult = await this.testEndpoint('GET', '/whatsapp/status');
        const notificationStatusResult = await this.testEndpoint('GET', '/notifications/status');
        
        return {
            whatsapp_status: statusResult,
            notification_status: notificationStatusResult
        };
    }

    async testPhoneFormatting() {
        await this.log('📞 Testing Phone Number Formatting...');
        
        const testCases = [
            { input: '0895341112220', expected: '62895341112220' },
            { input: '083832108514', expected: '62083832108514' },
            { input: '81230929260', expected: '6281230929260' },
            { input: '8123456789', expected: '628123456789' },
            { input: '628123456789', expected: '628123456789' }
        ];
        
        for (const testCase of testCases) {
            const result = await this.testEndpoint('POST', '/notifications/test', {
                phone: testCase.input,
                message: `Test formatting: ${testCase.input} → ${testCase.expected}`
            });
            
            if (result.success === false && result.data?.phone === testCase.expected) {
                await this.log(`✅ Phone formatting: ${testCase.input} → ${result.data.phone} ✓`);
            }
            
            await this.sleep(1000);
        }
    }

    async testSingleNotification() {
        await this.log('📱 Testing Single Notification...');
        
        for (const phone of testPhones) {
            await this.testEndpoint('POST', '/notifications/test', {
                phone: phone,
                message: `🧪 Test notification to ${phone} - ${new Date().toLocaleString('id-ID')}`
            });
            
            // Rate limiting delay
            await this.sleep(3000);
        }
    }

    async getSidangData() {
        await this.log('📊 Getting Sidang Data...');
        
        // Get sidang groups
        const groupsResult = await this.testEndpoint('GET', '/sidang-group');
        
        if (groupsResult.success && groupsResult.data.length > 0) {
            const firstGroup = groupsResult.data[0];
            await this.log(`📋 Found ${groupsResult.data.length} sidang groups`);
            
            // Get group details
            const detailResult = await this.testEndpoint('GET', `/sidang-group/${firstGroup.id}/detail`);
            
            if (detailResult.success && detailResult.data.items.length > 0) {
                return {
                    groups: groupsResult.data,
                    firstGroup: firstGroup,
                    firstGroupItems: detailResult.data.items
                };
            }
        }
        
        await this.log('⚠️ No sidang data found for testing');
        return null;
    }

    async testSidangNotification(sidangData) {
        if (!sidangData || !sidangData.firstGroupItems.length) {
            await this.log('⚠️ Skipping sidang notification test - no data available');
            return;
        }

        await this.log('🎓 Testing Sidang Notification...');
        
        const firstSidang = sidangData.firstGroupItems[0];
        await this.testEndpoint('POST', `/notifications/sidang/${firstSidang.id}`);
    }

    async testGroupNotification(sidangData) {
        if (!sidangData || !sidangData.firstGroup) {
            await this.log('⚠️ Skipping group notification test - no data available');
            return;
        }

        await this.log('👥 Testing Group Notification...');
        await this.testEndpoint('POST', `/notifications/group/${sidangData.firstGroup.id}`);
    }

    async runAllTests() {
        await this.log('🚀 Starting WhatsApp Integration Test Suite...');
        await this.log('📞 Test phones:', testPhones);
        
        // Test 1: WhatsApp Status
        const statusResults = await this.testWhatsAppStatus();
        
        if (!statusResults.whatsapp_status.data?.whatsapp_ready) {
            await this.log('⚠️ WhatsApp client not ready. Please scan QR code first!');
            await this.log('🔗 Open http://localhost:5000/whatsapp/register to scan QR code');
            return;
        }

        // Test 2: Phone formatting
        await this.testPhoneFormatting();
        
        // Test 3: Single notifications
        await this.testSingleNotification();
        
        // Test 3: Get sidang data
        const sidangData = await this.getSidangData();
        
        // Test 4: Sidang notification
        await this.testSidangNotification(sidangData);
        
        // Test 5: Group notification (if data available)
        if (sidangData) {
            await this.sleep(5000); // Wait before group test
            await this.testGroupNotification(sidangData);
        }

        // Summary
        await this.log('📋 Test Summary...');
        const successful = this.results.filter(r => r.message.includes('✅')).length;
        const failed = this.results.filter(r => r.message.includes('❌')).length;
        
        await this.log(`✅ Successful: ${successful}`);
        await this.log(`❌ Failed: ${failed}`);
        await this.log(`🎯 Total Tests: ${successful + failed}`);
        
        if (failed === 0) {
            await this.log('🎉 All tests passed! WhatsApp integration is working perfectly.');
        } else {
            await this.log('⚠️ Some tests failed. Check the logs above for details.');
        }
    }
}

// Run tests
const tester = new WhatsAppTester();

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'all';

async function main() {
    switch (command) {
        case 'status':
            await tester.testWhatsAppStatus();
            break;
        case 'test':
            await tester.testSingleNotification();
            break;
        case 'sidang':
            const sidangData = await tester.getSidangData();
            await tester.testSidangNotification(sidangData);
            break;
        case 'group':
            const groupData = await tester.getSidangData();
            await tester.testGroupNotification(groupData);
            break;
        case 'all':
        default:
            await tester.runAllTests();
            break;
    }
}

main().catch(console.error);
