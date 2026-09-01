const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  
  // List of interface names to ignore (case-insensitive)
  const virtualKeywords = [
    'wsl', 'virtual', 'hyper-v', 'vbox', 'virtualbox', 'vmware', 
    'docker', 'vethernet', 'vpn', 'wan', 'isatap', 'teredo', 
    'loopback', 'veth', 'host-only'
  ];

  const wifiKeywords = ['wi-fi', 'wifi', 'wlan', 'wireless'];

  const isPrivateIp = (ip) => {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    
    // 10.0.0.0/8
    if (first === 10) return true;
    
    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) return true;
    
    // 192.168.0.0/16
    if (first === 192 && second === 168) return true;
    
    return false;
  };

  const candidates = [];

  for (const interfaceName in interfaces) {
    const nameLower = interfaceName.toLowerCase();
    const isVirtual = virtualKeywords.some(keyword => nameLower.includes(keyword));
    const isWiFi = wifiKeywords.some(keyword => nameLower.includes(keyword));
    
    const ifaces = interfaces[interfaceName];
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal && isPrivateIp(iface.address)) {
        let score = 0;
        if (!isVirtual) {
          score += 50; // physical/non-virtual interface
        }
        if (isWiFi) {
          score += 100; // Wi-Fi interface (highest priority)
        }
        candidates.push({ address: iface.address, score });
      }
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0) {
    return candidates[0].address;
  }
  
  return '127.0.0.1';
};

const updateEnvFile = () => {
  const envPath = path.join(__dirname, '../.env');
  const localIp = getLocalIp();

  if (localIp === '127.0.0.1') {
    console.warn('[HERIXA-IP] Warning: No active LAN interface detected. Keeping existing .env config to avoid loopback overwrite.');
    runAdbReverse();
    return;
  }

  console.log(`[HERIXA-IP] Detected Development Host LAN IP: ${localIp}`);

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  if (envContent.includes('EXPO_PUBLIC_API_URL=https://')) {
    console.log('[HERIXA-IP] Production HTTPS API URL detected in .env; skipping local LAN IP override.');
    return;
  }

  // Check if EXPO_PUBLIC_LAN_IP is present in env file
  if (envContent.includes('EXPO_PUBLIC_LAN_IP=')) {
    envContent = envContent.replace(/EXPO_PUBLIC_LAN_IP=.*/g, `EXPO_PUBLIC_LAN_IP=${localIp}`);
  } else {
    envContent += `\nEXPO_PUBLIC_LAN_IP=${localIp}`;
  }

  // Check if EXPO_PUBLIC_API_URL is present in env file
  if (envContent.includes('EXPO_PUBLIC_API_URL=')) {
    envContent = envContent.replace(/EXPO_PUBLIC_API_URL=http:\/\/[\d\.]+:(\d+)/g, `EXPO_PUBLIC_API_URL=http://${localIp}:$1`);
    envContent = envContent.replace(/EXPO_PUBLIC_API_URL=http:\/\/localhost:(\d+)/g, `EXPO_PUBLIC_API_URL=http://${localIp}:$1`);
  } else {
    envContent += `\nEXPO_PUBLIC_API_URL=http://${localIp}:5000`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`[HERIXA-IP] Updated .env file with EXPO_PUBLIC_LAN_IP=${localIp} and EXPO_PUBLIC_API_URL`);
  
  runAdbReverse();
};

const runAdbReverse = () => {
  console.log('[HERIXA-IP] Running adb reverse tcp:5000 tcp:5000...');
  exec('adb reverse tcp:5000 tcp:5000', (err, stdout, stderr) => {
    if (err) {
      console.log('[HERIXA-IP] Info: adb reverse failed (no USB device attached or adb not in PATH). Wi-Fi/LAN fallback will be active.');
    } else {
      console.log('[HERIXA-IP] Successfully ran adb reverse tcp:5000 tcp:5000 for USB debugging.');
    }
  });
};

updateEnvFile();
