
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/visits/history?scope=history&limit=1',
    method: 'GET',
    headers: {
        'Cookie': 'next-auth.session-token=...' // Mock session? No, need real one.
    }
};

// Since we can't easily get a valid session token, we might get 401.
// But we want to see if the server LOGS "HIT!!!".

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();
