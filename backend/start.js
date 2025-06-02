const app = require('./server');
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});

// "start": "node start.js",
//     "dev": "nodemon start.js",