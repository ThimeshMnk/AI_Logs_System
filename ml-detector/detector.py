import json
import pandas as pd
from confluent_kafka import Consumer, KafkaError
from sklearn.ensemble import IsolationForest
import numpy as np
import socketio 
import eventlet

KAFKA_CONFIG = {
    'bootstrap.servers' : "localhost:9092",
    'group.id' : "ml-security-group",
    'auto.offset.reset' : 'latest'
}

model = IsolationForest(contamination=0.1, random_state=42)

buffer = []
BUFFER_LIMIT = 100

def process_logs():
    consumer = Consumer(KAFKA_CONFIG)
    consumer.subscribe(['network-logs'])

    print("ML detector is now online, listening for logs..")

    try:
        while True:
            msg = consumer.poll(1.0)

            if msg is None:continue
            if msg.error():
                print(f"Consumer Error: {msg.error()}")
                continue

            log_entry = json.loads(msg.value().decode('utf-8'))

            
            
            features = [log_entry['status'], log_entry['response_time_ms']]
            buffer.append(features)

            if len(buffer) >= 50:

                data_matrix = np.array(buffer)

                model.fit(data_matrix)

                prediction = model.predict([features])[0]

                sio = socketio.Server(cors_allowed_origins='*')
                app = socketio.WSGIApp(sio)

                if prediction == -1:

                    alert_data = {
                        "ip" : log_entry['ip_address'],
                        "status" : log_entry['status'],
                        "time" : log_entry['respomse_time_ms'],
                        "timestamp" : log_entry['timestamp']
                    }

                    print(f"🚨 ALERT: {alert_data['ip']}")
                    sio.emit('anomaly_detected', alert_data) 
                else:
                    print(f"Log Verified: {log_entry['ip_address']} - Normal")

                if len(buffer) > BUFFER_LIMIT:
                    buffer.pop(0)

    except KeyboardInterrupt:
        print("Shutting down detector...")
    finally:
        consumer.close()

if __name__ == "__main__":
    process_logs()
                