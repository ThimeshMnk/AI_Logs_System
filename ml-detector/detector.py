import json
import pandas as pd
import numpy as np
from confluent_kafka import Consumer
from sklearn.ensemble import IsolationForest
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

model = IsolationForest(contamination=0.1)
data_buffer = []

def kafka_logic():
    conf = {'bootstrap.servers': "localhost:9092", 'group.id': "ml-group-v3", 'auto.offset.reset': 'latest'}
    consumer = Consumer(conf)
    consumer.subscribe(['network-logs'])
    
    print("AI Brain is active...")
    
    while True:
        msg = consumer.poll(1.0)
        if msg is None or msg.error():
            socketio.sleep(0.1) 
            continue
        
        log_data = json.loads(msg.value().decode('utf-8'))
        features = [float(log_data['status']), float(log_data['response_time_ms'])]
        data_buffer.append(features)

        if len(data_buffer) > 50:
            X = np.array(data_buffer)
            model.fit(X)
            prediction = model.predict([features])[0]

            if prediction == -1:
                print(f"SENDING ALERT: {log_data['ip_address']}")
                socketio.emit('anomaly_detected', {
                    "ip": log_data['ip_address'],
                    "status": log_data['status'],
                    "time": log_data['response_time_ms'],
                    "timestamp": log_data['timestamp']
                })
            
            if len(data_buffer) > 100:
                data_buffer.pop(0)
        
        socketio.sleep(0.01)

@socketio.on('connect')
def handle_connect():
    print("Dashboard connected to AI Engine")
    socketio.emit('anomaly_detected', {
        "ip": "SYSTEM_TEST", "status": 200, "time": 0, "timestamp": "NOW"
    })

if __name__ == '__main__':
    socketio.start_background_task(kafka_logic)
    print("Server running on http://127.0.0.1:5000")
    socketio.run(app, port=5000, debug=False)