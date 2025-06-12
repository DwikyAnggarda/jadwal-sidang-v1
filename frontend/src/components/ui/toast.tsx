// Simple toast implementation
const toast = {
  success: (message: string) => {
    console.log('SUCCESS:', message);
    alert('✅ ' + message);
  },
  error: (message: string) => {
    console.log('ERROR:', message);
    alert('❌ ' + message);
  },
  info: (message: string) => {
    console.log('INFO:', message);
    alert('ℹ️ ' + message);
  },
};

export { toast };
