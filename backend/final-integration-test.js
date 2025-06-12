#!/usr/bin/env node

const axios = require('axios');

const COLORS = {
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m'
};

class WhatsAppIntegrationTest {
    constructor() {
        this.baseURL = 'http://localhost:5000';
        this.testResults = [];
    }

    log(message, color = COLORS.RESET) {
        const timestamp = new Date().toLocaleTimeString('id-ID');
        console.log(`${color}[${timestamp}] ${message}${COLORS.RESET}`);
    }

    success(message) { this.log(`✅ ${message}`, COLORS.GREEN); }
    error(message) { this.log(`❌ ${message}`, COLORS.RED); }
    info(message) { this.log(`ℹ️  ${message}`, COLORS.BLUE); }
    warning(message) { this.log(`⚠️  ${message}`, COLORS.YELLOW); }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testPhoneFormatting() {
        this.log(`\n${COLORS.BOLD}📞 TESTING PHONE NUMBER FORMATTING${COLORS.RESET}`);
        
        const testCases = [
            { input: '0895341112220', expected: '62895341112220', description: '08xxx format' },
            { input: '083832108514', expected: '6283832108514', description: '08xxx format (different)' },
            { input: '81230929260', expected: '6281230929260', description: '8xxx format' },
            { input: '8123456789', expected: '628123456789', description: '8xxx format (short)' },
            { input: '01230929260', expected: '621230929260', description: '0xxx format' },
            { input: '628123456789', expected: '628123456789', description: '62xxx format (already formatted)' }
        ];
        
        let passed = 0;
        
        for (const test of testCases) {
            try {
                const response = await axios.post(`${this.baseURL}/notifications/test`, {
                    phone: test.input,
                    message: 'Test formatting'
                }, { timeout: 5000 });
                
                // Should not reach here if WhatsApp not ready
                this.error(`Unexpected success for ${test.input}`);
            } catch (error) {
                const actualPhone = error.response?.data?.phone;
                if (actualPhone === test.expected) {
                    this.success(`${test.input} → ${actualPhone} (${test.description})`);
                    passed++;
                } else {
                    this.error(`${test.input} → ${actualPhone} (expected: ${test.expected})`);
                }
            }
            
            await this.sleep(300);
        }
        
        this.info(`Phone formatting tests: ${passed}/${testCases.length} passed`);
        return { passed, total: testCases.length };
    }

    async testEndpointStatus() {
        this.log(`\n${COLORS.BOLD}🔍 TESTING API ENDPOINTS${COLORS.RESET}`);
        
        const endpoints = [
            { method: 'GET', path: '/whatsapp/status', description: 'WhatsApp Status' },
            { method: 'GET', path: '/notifications/status', description: 'Notification Status' },
            { method: 'GET', path: '/sidang-group', description: 'Sidang Groups' }
        ];
        
        let passed = 0;
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios({
                    method: endpoint.method,
                    url: `${this.baseURL}${endpoint.path}`,
                    timeout: 5000
                });
                
                this.success(`${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
                passed++;
            } catch (error) {
                this.error(`${endpoint.method} ${endpoint.path} - ${error.message}`);
            }
            
            await this.sleep(200);
        }
        
        this.info(`Endpoint tests: ${passed}/${endpoints.length} passed`);
        return { passed, total: endpoints.length };
    }

    async testNotificationEndpoints() {
        this.log(`\n${COLORS.BOLD}📱 TESTING NOTIFICATION ENDPOINTS${COLORS.RESET}`);
        
        // Test single notification
        try {
            const response = await axios.post(`${this.baseURL}/notifications/test`, {
                phone: '0895341112220',
                message: 'Integration test message'
            }, { timeout: 10000 });
            
            this.error('Unexpected success - WhatsApp should not be ready');
        } catch (error) {
            if (error.response?.data?.error?.includes('WhatsApp client is not ready')) {
                this.success('Single notification error handling works correctly');
            } else {
                this.error(`Unexpected error: ${error.message}`);
            }
        }
        
        // Test with real sidang data
        try {
            const groupsResponse = await axios.get(`${this.baseURL}/sidang-group`);
            
            if (groupsResponse.data.length > 0) {
                const firstGroup = groupsResponse.data[0];
                this.info(`Found sidang group: ${firstGroup.id} (${firstGroup.tanggal_sidang})`);
                
                // Get group details
                const detailResponse = await axios.get(`${this.baseURL}/sidang-group/${firstGroup.id}/detail`);
                
                if (detailResponse.data.items.length > 0) {
                    const firstSidang = detailResponse.data.items[0];
                    this.info(`Testing with sidang: ${firstSidang.id} (${firstSidang.nama_mahasiswa})`);
                    
                    // Test sidang notification (should fail gracefully)
                    try {
                        const notifResponse = await axios.post(`${this.baseURL}/notifications/sidang/${firstSidang.id}`, {}, { 
                            timeout: 20000 
                        });
                        
                        const summary = notifResponse.data.summary;
                        if (summary.sent === 0 && summary.failed > 0) {
                            this.success(`Sidang notification handles WhatsApp not ready: ${summary.failed} failed as expected`);
                        } else {
                            this.warning(`Unexpected result: ${summary.sent} sent, ${summary.failed} failed`);
                        }
                    } catch (error) {
                        this.error(`Sidang notification request failed: ${error.message}`);
                    }
                } else {
                    this.warning('No sidang items found in group');
                }
            } else {
                this.warning('No sidang groups found');
            }
        } catch (error) {
            this.error(`Failed to get sidang data: ${error.message}`);
        }
    }

    async testWhatsAppQRCode() {
        this.log(`\n${COLORS.BOLD}📱 TESTING WHATSAPP QR CODE${COLORS.RESET}`);
        
        try {
            const response = await axios.get(`${this.baseURL}/whatsapp/register`, { timeout: 5000 });
            
            if (response.data.qr) {
                this.success('QR Code generated successfully');
                this.info('QR Code is available for scanning');
                this.info(`Open: ${this.baseURL}/whatsapp/register in browser to scan`);
            } else if (response.data.message?.includes('already active')) {
                this.success('WhatsApp client is already active');
            } else {
                this.warning('QR Code not available - may need to wait');
            }
        } catch (error) {
            this.error(`QR Code request failed: ${error.message}`);
        }
    }

    async runCompleteTest() {
        this.log(`${COLORS.BOLD}${COLORS.CYAN}🚀 STARTING WHATSAPP INTEGRATION TEST SUITE${COLORS.RESET}`);
        this.log(`${COLORS.CYAN}Target: ${this.baseURL}${COLORS.RESET}`);
        this.log(`${COLORS.CYAN}Time: ${new Date().toLocaleString('id-ID')}${COLORS.RESET}`);
        
        const results = {
            phoneFormatting: await this.testPhoneFormatting(),
            endpointStatus: await this.testEndpointStatus(),
            qrCode: await this.testWhatsAppQRCode(),
            notifications: await this.testNotificationEndpoints()
        };
        
        // Summary
        this.log(`\n${COLORS.BOLD}📊 TEST SUMMARY${COLORS.RESET}`);
        this.log(`${COLORS.CYAN}=================${COLORS.RESET}`);
        
        const totalPassed = (results.phoneFormatting?.passed || 0) + (results.endpointStatus?.passed || 0);
        const totalTests = (results.phoneFormatting?.total || 0) + (results.endpointStatus?.total || 0);
        
        this.log(`Phone Formatting: ${results.phoneFormatting?.passed || 0}/${results.phoneFormatting?.total || 0}`);
        this.log(`Endpoint Tests: ${results.endpointStatus?.passed || 0}/${results.endpointStatus?.total || 0}`);
        this.log(`Total: ${totalPassed}/${totalTests}`);
        
        if (totalPassed === totalTests) {
            this.success(`🎉 ALL CORE TESTS PASSED! Integration is working correctly.`);
        } else {
            this.warning(`⚠️  ${totalTests - totalPassed} tests failed. Check the details above.`);
        }
        
        this.info(`\n💡 Next steps:`);
        this.info(`1. Scan QR code at: ${this.baseURL}/whatsapp/register`);
        this.info(`2. Once WhatsApp is connected, notifications will work end-to-end`);
        this.info(`3. Test frontend integration`);
    }
}

// Run the test
const tester = new WhatsAppIntegrationTest();
tester.runCompleteTest().catch(console.error);
