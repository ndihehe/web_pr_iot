const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors'); // <-- THÊM DÒNG NÀY
require('dotenv').config();

const app = express();
app.use(cors()); // <-- THÊM DÒNG NÀY (Cho phép Express nhận mọi nguồn)

const server = http.createServer(app);

// SỬA LẠI ĐOẠN KHỞI TẠO SOCKET.IO NÀY THẬT CHUẨN:
const io = new Server(server, {
    cors: {
        origin: "*", // Cho phép tất cả các cổng (bao gồm localhost:5500) kết nối vào
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true // Hỗ trợ thêm các phiên bản Socket.io cũ hơn nếu có xung đột
});

io.on('connection', (socket) => {
    console.log('Một trình duyệt HTML vừa kết nối vào Backend: ' + socket.id);
});

// 2. Kết nối tới MQTT Broker (Thay bằng thông tin Broker của bạn)
// Ở đây ví dụ dùng Broker công cộng của HiveMQ để test
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com"; 
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
    console.log('Backend đã kết nối thành công tới MQTT Broker!');
    // Subscribe nhận dữ liệu tổng hợp của bệnh nhân
    mqttClient.subscribe('health/patient/data', (err) => {
        if (!err) console.log('Đã subscribe topic: health/patient/data');
    });
});

// 3. Hứng dữ liệu từ ESP32 gửi lên và bắn ngay sang cho HTML Frontend
mqttClient.on('message', (topic, message) => {
    try {
        const payloadString = message.toString();
        const jsonPayload = JSON.parse(payloadString);
        
        console.log("Nhận tin từ ESP32:", jsonPayload);

        // Bắn gói tin này xuống file HTML qua sự kiện "sensor_data_update"
        io.emit('sensor_data_update', jsonPayload);

    } catch (error) {
        console.log("Lỗi parse JSON hoặc lỗi truyền dữ liệu: ", error.message);
    }
});

// Start Server Backend
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend Server đang chạy tại port ${PORT}`);
});